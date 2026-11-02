"""Find safe high ground near the danger zones, place road-side assembly points, rate shelters by height.

    python3 build_safe_areas.py --kubectl              # dry run: what it found
    python3 build_safe_areas.py --kubectl --apply      # save, then rebuild the evacuation routes

Run after build_river_zones.py (use the same --rise). For each dam:
1. Safe high ground = land at least --margin m (default 20) above the expected flood water, outside every
   danger zone and reservoir, within 3 km of the evacuation zones (L1–L3). Shown green on the maps.
2. Up to --points assembly points per dam: in each safe area, the high spot closest to the zones that a road
   reaches (checked with Valhalla; the point is moved onto the road). Saved as system_safe_locations
   (type safe_zone, code HG-...), with the green area as their outline.
3. Every shelter gets its height and a flood safety rating (safe / marginal / unsafe) in its amenities JSON;
   routing sends people to safe high ground first.
4. The offline route packs (one road route per zone) are rebuilt, so the maps can draw evacuation routes.
Data only (no schema change). Heights: SRTM 30 m (cached). Illustrative demo data, not official guidance.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import uuid
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_river_zones as rz  # noqa: E402
from seed_demo import quote, records, sql  # noqa: E402
from cleanup_demo_data import Plan, columns, foreign_keys  # noqa: E402

CELL = rz.CELL_M
NEAR_ZONES_M = 3000
OSM_PLACES = Path.home() / '.ddas-osm-places.json'
NS = uuid.UUID('0b8f1f5e-4c2a-4f49-9c0b-1d3a5e7f2c11')


def valhalla_route(frm, to, costing='pedestrian'):
    """Route between (lat, lng) points through the Valhalla pod; returns [lng, lat] points or None."""
    body = json.dumps({'locations': [{'lat': frm[0], 'lon': frm[1]}, {'lat': to[0], 'lon': to[1]}], 'costing': costing})
    p = subprocess.run(['kubectl', '-n', 'ddas', 'exec', '-i', 'deploy/valhalla', '--', 'curl', '-s', '-X', 'POST',
                        'http://localhost:8002/route', '-H', 'Content-Type: application/json', '-d', '@-'],
                       input=body.encode(), capture_output=True)
    try:
        trip = json.loads(p.stdout)['trip']
        return rz_decode(trip['legs'][0]['shape'])
    except Exception:
        return None


def rz_decode(encoded):
    pts, index, lat, lng = [], 0, 0, 0
    while index < len(encoded):
        vals = []
        for _ in range(2):
            shift = value = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                value |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            vals.append(~(value >> 1) if value & 1 else value >> 1)
        lat += vals[0]
        lng += vals[1]
        pts.append([lng / 1e6, lat / 1e6])
    return pts


def place_names():
    if not OSM_PLACES.exists():
        return []
    out = []
    for el in json.loads(OSM_PLACES.read_text()).get('elements', []):
        name = el.get('tags', {}).get('name:en') or el.get('tags', {}).get('name')
        lat = el.get('lat') or el.get('center', {}).get('lat')
        lng = el.get('lon') or el.get('center', {}).get('lon')
        if name and lat:
            out.append((float(lat), float(lng), name))
    return out


def water_level_fn(river, bed, total):
    """Expected flood water height (m) at a point: nearest river point's bed + its level's rise."""
    def at(x, y):
        p = min(river, key=lambda q: (q[0] - x) ** 2 + (q[1] - y) ** 2)
        lv = rz.level_at(p[2])
        base = bed.get(round(p[2]))
        if base is None:
            return None, p
        if lv is None:
            return base, p                    # beyond the last level: no extra rise
        f = (p[2] - lv[1] * 1000) / max(1, (lv[2] - lv[1]) * 1000)
        return base + (lv[3] + (lv[4] - lv[3]) * f) * rz.RISE_SCALE, p
    return at


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--rise', type=float, default=1.0, help='Same --rise used for build_river_zones.py')
    parser.add_argument('--margin', type=float, default=20, help='Metres above the flood water to count as safe')
    parser.add_argument('--points', type=int, default=4, help='Assembly points per dam')
    args = parser.parse_args()
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl
    rz.RISE_SCALE = args.rise

    dams = records("SELECT id, code, name, latitude, longitude, downstream_river_geojson g FROM dams "
                   "WHERE status <> 'decommissioned' AND downstream_river_geojson IS NOT NULL")
    zones = records('SELECT z.id, z.dam_id, z.zone_code, z.boundary_geojson g, h.level_number lv, h.evacuation_required evac '
                    'FROM dam_hazard_zones z JOIN hazard_levels h ON h.id = z.hazard_level_id WHERE z.is_active = 1')
    reservoirs = [ring for r in records('SELECT reservoir_boundary_geojson g FROM dams WHERE reservoir_boundary_geojson IS NOT NULL')
                  for ring in rz.rings_of(r['g'])]
    shelters = records("SELECT id, code, name, latitude, longitude, amenities FROM system_safe_locations "
                       "WHERE deleted_at IS NULL AND code NOT LIKE 'HG-%'")
    places = place_names()
    all_zone_rings = [(z, ring) for z in zones for ring in rz.rings_of(z['g'])]

    new_points, ratings = [], {}
    for dam in dams:
        lat0 = float(dam['latitude'])
        dam_xy = rz.to_xy(float(dam['longitude']), lat0, lat0)
        xy = [rz.to_xy(lng, lat, lat0) for lng, lat in rz.lines_of(dam['g'])]
        if math.dist(xy[-1], dam_xy) < math.dist(xy[0], dam_xy):
            xy = xy[::-1]
        river, total = rz.densify(xy, CELL)
        to_ll = lambda x, y: rz.to_lnglat(x, y, lat0)
        zone_rings_xy = [(z, [rz.to_xy(lng, lat, lat0) for lng, lat in ring]) for z, ring in all_zone_rings]
        evac_rings = [r for z, r in zone_rings_xy if int(z['dam_id']) == int(dam['id']) and int(z['evac'])]
        if not evac_rings:
            print(f'{dam["name"]}: no evacuation zones, skipped (run build_river_zones.py first)')
            continue
        res_xy = [[rz.to_xy(lng, lat, lat0) for lng, lat in r] for r in reservoirs]

        # Grid around this dam's evacuation zones (+3 km)
        xs = [p[0] for r in evac_rings for p in r]
        ys = [p[1] for r in evac_rings for p in r]
        i0, i1 = int((min(xs) - NEAR_ZONES_M) // CELL), int((max(xs) + NEAR_ZONES_M) // CELL)
        j0, j1 = int((min(ys) - NEAR_ZONES_M) // CELL), int((max(ys) + NEAR_ZONES_M) // CELL)
        centre = lambda c: ((c[0] + .5) * CELL, (c[1] + .5) * CELL)
        grid = [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]
        in_zone = {c for c in grid if any(rz.inside(*centre(c), r) for _, r in zone_rings_xy)}
        in_evac = {c for c in in_zone if any(rz.inside(*centre(c), r) for r in evac_rings)}
        # Distance (in cells) from the evacuation zones, up to 3 km
        dist, q = {c: 0 for c in in_evac}, deque(in_evac)
        limit = NEAR_ZONES_M // CELL
        while q:
            c = q.popleft()
            if dist[c] >= limit:
                continue
            for n in ((c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1)):
                if i0 <= n[0] <= i1 and j0 <= n[1] <= j1 and n not in dist:
                    dist[n] = dist[c] + 1
                    q.append(n)
        candidates = [c for c in dist if c not in in_zone and not any(rz.inside(*centre(c), r) for r in res_xy)]
        print(f'{dam["name"]}: checking {len(candidates)} cells within 3 km of its zones', flush=True)

        heights, key = rz.elevations([to_ll(*centre(c))[::-1] for c in candidates]
                                     + [to_ll(p[0], p[1])[::-1] for p in river[::2]]
                                     + [(float(s['latitude']), float(s['longitude'])) for s in shelters])
        h = lambda x, y: heights.get(key(*to_ll(x, y)[::-1]))
        bed = {}
        for p in river[::2]:
            v = h(p[0], p[1])
            if v is not None:
                for d in range(int(p[2]) - CELL, int(p[2]) + CELL + 1):
                    bed.setdefault(d, v)
        water_at = water_level_fn(river[::2], bed, total)

        safe = set()
        height_above = {}
        for c in candidates:
            g = h(*centre(c))
            w, _ = water_at(*centre(c))
            if g is not None and w is not None and g >= w + args.margin:
                safe.add(c)
                height_above[c] = g - w
        # Connected safe areas, nearest to the zones first, spaced at least 1.5 km apart
        comps, seen = [], set()
        for c in sorted(safe, key=lambda c: dist[c]):
            if c in seen:
                continue
            comp, q = set(), deque([c])
            seen.add(c)
            while q:
                a = q.popleft()
                comp.add(a)
                for n in ((a[0] + 1, a[1]), (a[0] - 1, a[1]), (a[0], a[1] + 1), (a[0], a[1] - 1)):
                    if n in safe and n not in seen:
                        seen.add(n)
                        q.append(n)
            if len(comp) >= 4:                # at least 0.16 km²
                comps.append(comp)
        print(f'  {len(safe)} safe cells in {len(comps)} areas', flush=True)

        chosen = []
        for comp in comps:
            if len(chosen) >= args.points:
                break
            near = min(dist[c] for c in comp)
            # The high spot near the zone edge of this area
            spot = max((c for c in comp if dist[c] <= near + 3), key=lambda c: height_above[c])
            sx, sy = centre(spot)
            if any(math.dist((sx, sy), (p['x'], p['y'])) < 1500 for p in chosen):
                continue
            spot_ll = to_ll(sx, sy)
            # Route from the nearest point inside the evacuation zone: is the high ground reachable by road?
            inner = min(in_evac, key=lambda c: math.dist(centre(c), (sx, sy)))
            start = to_ll(*centre(inner))[::-1]
            path = valhalla_route(start, (spot_ll[1], spot_ll[0]))
            if not path:
                continue
            road = path[-1]                     # Valhalla snaps the destination onto the nearest road
            rx, ry = rz.to_xy(road[0], road[1], lat0)
            if math.dist((rx, ry), (sx, sy)) > 600:
                continue                        # no road close to this high ground
            rg, rw = h(rx, ry), water_at(rx, ry)[0]
            above = (rg - rw) if rg is not None and rw is not None else height_above[spot]
            if above < args.margin / 2:
                continue
            ring_cells = [rz.chaikin([(i * CELL, j * CELL) for i, j in ring]) for ring in rz.outlines(comp)]
            polygons = [[[to_ll(x, y) for x, y in r]] for r in ring_cells if len(r) > 8]
            km_to = lambda p: math.dist(rz.to_xy(p[1], p[0], lat0), (rx, ry))
            near_name = min(places, key=km_to, default=None)
            letter = 'ABCDEFGH'[len(chosen)]
            label = near_name[2] if near_name and km_to(near_name) < 2500 else None
            chosen.append(dict(x=rx, y=ry, lat=road[1], lng=road[0], above=round(above), letter=letter,
                               area_km2=round(len(comp) * CELL * CELL / 1e6, 2), polygons=polygons,
                               name=f'High ground {letter}' + (f': near {label}' if label else f': {dam["name"].replace(" Dam", "")}'),
                               code=f'HG-{rz.CODES.get(dam["code"], dam["code"][:3])}-{letter}', dam_id=int(dam['id']),
                               ground=round(rg or 0)))
        for p in chosen:
            print(f'  {p["code"]}: {p["name"]} · +{p["above"]} m above flood · {p["area_km2"]} km² safe area')
        new_points += chosen

        # Rate the shelters nearest this dam
        for s in shelters:
            sx, sy = rz.to_xy(float(s['longitude']), float(s['latitude']), lat0)
            if math.dist((sx, sy), dam_xy) > 40000:
                continue
            g = heights.get(key(float(s['latitude']), float(s['longitude'])))
            w, _ = water_at(sx, sy)
            zone_lv = next((int(z['lv']) for z, r in zone_rings_xy if rz.inside(sx, sy, r)), None)
            above = None if g is None or w is None else g - w
            if zone_lv is not None and zone_lv <= 3:
                rating = 'unsafe'
            elif above is None:
                rating = 'marginal'
            elif above < 5:
                rating = 'unsafe'
            elif above < args.margin or zone_lv is not None:
                rating = 'marginal'
            else:
                rating = 'safe'
            prev = ratings.get(s['id'])
            if prev is None or ['safe', 'marginal', 'unsafe'].index(rating) > ['safe', 'marginal', 'unsafe'].index(prev[0]):
                ratings[s['id']] = (rating, None if above is None else round(above), g)

    counts = {k: sum(1 for r in ratings.values() if r[0] == k) for k in ('safe', 'marginal', 'unsafe')}
    print(f'\nShelters rated: {counts["safe"]} safe high ground, {counts["marginal"]} marginal, {counts["unsafe"]} unsafe')
    for sid, (rating, above, _) in ratings.items():
        name = next(s['name'] for s in shelters if s['id'] == sid)
        print(f'  {rating:<8} {("+" + str(above) + " m") if above is not None else "?":>8}  {name}')
    if not args.apply:
        print(f'\nDry run: {len(new_points)} assembly points. Re-run with --apply to save them.')
        return

    types = {r['code']: r['id'] for r in records('SELECT id, code FROM location_types')}
    if 'safe_zone' not in types:
        sql("INSERT INTO location_types (code, name, category, is_evacuation_point, marker_color, is_active) "
            "VALUES ('safe_zone', 'Safe Zone', 'shelter', 1, '#16A34A', 1)")
        types = {r['code']: r['id'] for r in records('SELECT id, code FROM location_types')}
    plan = Plan(columns(), foreign_keys(), None)
    plan.delete('system_safe_locations', "code LIKE 'HG-%'")
    statements = [(f'UPDATE `{t}` SET `{c}`=NULL WHERE {w}' if k == 'clear' else f'DELETE FROM `{t}` WHERE {w}')
                  for k, t, c, w in plan.steps]
    for p in new_points:
        statements.append(
            'INSERT INTO system_safe_locations (uuid, code, name, description, location_type_id, latitude, longitude, elevation_meters, '
            'boundary_geojson, capacity_persons, current_occupancy, primary_dam_id, status, is_verified, show_on_map, marker_icon, '
            'marker_color, amenities) VALUES (' + ', '.join(map(quote, [
                str(uuid.uuid5(NS, p['code'])), p['code'], p['name'],
                f'High ground assembly point on the road, +{p["above"]} m above the expected flood (illustrative demo data).',
                types['safe_zone'], p['lat'], p['lng'], p['ground'], {'type': 'MultiPolygon', 'coordinates': p['polygons']},
                800, 0, p['dam_id'], 'active', 0, 1, 'safe_zone', '#16A34A',
                {'kind': 'high_ground', 'floodSafety': 'safe', 'aboveFloodM': p['above'], 'safeAreaKm2': p['area_km2']}])) + ')')
    for sid, (rating, above, ground) in ratings.items():
        statements.append(
            "UPDATE system_safe_locations SET amenities = JSON_SET(COALESCE(amenities, JSON_OBJECT()), '$.floodSafety', "
            f"{quote(rating)}, '$.aboveFloodM', {'NULL' if above is None else int(above)}, '$.kind', 'shelter')"
            + (f', elevation_meters = {round(ground, 1)}' if ground is not None else '') + f' WHERE id = {int(sid)}')
    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    print(f'Saved {len(new_points)} assembly points and {len(ratings)} shelter ratings.')

    try:
        from evacuation_scenario import admin_api
        built = admin_api('http://localhost').call('POST', '/api/v1/blocked-roads/rebuild-packs')
        print(f'Evacuation routes rebuilt: {built}')
    except Exception as e:   # noqa: BLE001 - routes also rebuild by themselves every 6 hours
        print(f'Could not rebuild routes now ({e}); they rebuild by themselves every 6 hours, or use the Rebuild button.')


if __name__ == '__main__':
    main()
