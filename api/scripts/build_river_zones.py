"""Replace each dam's danger zones with 5 levels that follow its downstream river and the real terrain.

    python3 build_river_zones.py --kubectl              # dry run: zones it would create
    python3 build_river_zones.py --kubectl --apply      # back up the old zones, then replace them
    python3 build_river_zones.py --kubectl --no-terrain # simple widening bands (no elevation download)

How a zone is made (terrain mode, the default):
1. Ground height on a 200 m grid along the river valley comes from SRTM 30 m elevation (OpenTopoData,
   downloaded once and cached in ~/.ddas-elevation.json).
2. The water rises more near the dam (+12 m above the river bed) than far downstream (+4 m).
3. A cell floods if it is lower than the water at the nearest river point AND connected to the river,
   so zones spread into flat valleys and stop at hills. Reservoir water (OSM outlines) is cut out.
4. Levels follow water arrival time along the river; outlines are smoothed.
Data only (no schema change). The dam, reservoir and river outlines are untouched. Illustrative demo
zones, not an official flood map.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import docker, quote, records, sql  # noqa: E402
from cleanup_demo_data import Plan, columns, foreign_keys  # noqa: E402
import csv  # noqa: E402

csv.field_size_limit(2**31 - 1)   # OSM reservoir outlines are larger than the default 128 KB per field

# level, from km, to km, water rise at start (m), at end (m), max half-width (m), water arrives (min), fill, stroke, opacity, name
# The Mahaweli runs through steep gorges, so a dam release rises tens of metres above the bed.
LEVELS = [
    (1, 0, 3, 30, 26, 1200, 5, '#DC2626', '#991B1B', 0.42, 'Extreme danger'),
    (2, 3, 8, 26, 22, 1800, 23, '#F97316', '#C2410C', 0.36, 'High danger'),
    (3, 8, 15, 22, 16, 2400, 53, '#EAB308', '#A16207', 0.32, 'Moderate danger'),
    (4, 15, 25, 16, 12, 3000, 100, '#FDE047', '#CA8A04', 0.26, 'Low danger'),
    (5, 25, 35, 12, 10, 3500, 163, '#22C55E', '#15803D', 0.2, 'Watch'),
]
CELL_M = 200
RIVERSIDE_M = 500   # --strip: always in the zone (riverbanks, riverside roads), whatever the terrain data says
RISE_SCALE = 1.0    # --rise: multiplies every level's water rise
WIDTH_SCALE = 1.5   # --width: multiplies every level's maximum width
CODES = {'KOT-01': 'KOT', 'VIC-01': 'VIC', 'RAN-01': 'RAN', 'DEMO-001': 'KOT', 'DEMO-002': 'VIC', 'DEMO-003': 'RAN'}
ELEVATION_URL = 'https://api.opentopodata.org/v1/srtm30m'
ELEVATION_CACHE = Path.home() / '.ddas-elevation.json'


# ── Geometry helpers (local metres around the dam) ──────────────────────────────

def to_xy(lng, lat, lat0):
    return lng * 111320 * math.cos(math.radians(lat0)), lat * 110540


def to_lnglat(x, y, lat0):
    return [round(x / (111320 * math.cos(math.radians(lat0))), 7), round(y / 110540, 7)]


def lines_of(geojson):
    g = json.loads(geojson) if isinstance(geojson, str) else geojson
    g = g.get('geometry', g)
    if g['type'] == 'LineString':
        return g['coordinates']
    if g['type'] == 'MultiLineString':
        return [p for part in g['coordinates'] for p in part]
    raise ValueError(f'Unsupported river geometry {g["type"]}')


def rings_of(geojson):
    try:
        g = json.loads(geojson) if isinstance(geojson, str) else geojson
        g = g.get('geometry', g)
        if g['type'] == 'Polygon':
            return [g['coordinates'][0]]
        if g['type'] == 'MultiPolygon':
            return [p[0] for p in g['coordinates']]
        if g['type'] == 'FeatureCollection':
            return [r for f in g['features'] for r in rings_of(f)]
    except Exception:
        pass
    return []


def inside(x, y, ring):
    hit = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]
        x2, y2 = ring[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def densify(xy, step):
    """River points every `step` metres, each with its distance from the dam."""
    out, dist = [(xy[0][0], xy[0][1], 0.0)], 0.0
    for (x1, y1), (x2, y2) in zip(xy, xy[1:]):
        seg = math.hypot(x2 - x1, y2 - y1)
        n = max(1, int(seg // step))
        for k in range(1, n + 1):
            f = k / n
            out.append((x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, dist + seg * f))
        dist += seg
    return out, dist


def level_at(d_m):
    for lv in LEVELS:
        if lv[1] * 1000 <= d_m < lv[2] * 1000:
            return lv
    return None


def chaikin(ring, rounds=2):
    """Smooth a closed ring by corner cutting."""
    pts = ring[:-1]
    for _ in range(rounds):
        new = []
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            new += [(0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2), (0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2)]
        pts = new
    return pts + [pts[0]]


def outlines(cells):
    """Outer boundaries of a set of grid cells (i, j) as rings of grid corner points."""
    edges = {}
    for i, j in cells:
        for a, b in (((i, j), (i + 1, j)), ((i + 1, j), (i + 1, j + 1)), ((i + 1, j + 1), (i, j + 1)), ((i, j + 1), (i, j))):
            if (b, a) in edges:
                del edges[(b, a)]      # shared with a neighbour: not a boundary
            else:
                edges[(a, b)] = True
    nxt = {}
    for a, b in edges:
        nxt.setdefault(a, []).append(b)
    rings = []
    while nxt:
        start = next(iter(nxt))
        ring, cur = [start], start
        while True:
            b = nxt[cur].pop()
            if not nxt[cur]:
                del nxt[cur]
            if b == start:
                break
            ring.append(b)
            cur = b
            if cur not in nxt:
                break
        ring.append(ring[0])
        area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:])) / 2
        if area > 0 and len(ring) > 4:   # counter-clockwise = outer edge; clockwise loops are holes
            rings.append(ring)
    return rings


# ── Elevation (SRTM via OpenTopoData), cached ───────────────────────────────────

def elevations(points):
    """{(lat, lng) rounded to 4 dp: metres} for every point, downloading only what is not cached."""
    cache = json.loads(ELEVATION_CACHE.read_text()) if ELEVATION_CACHE.exists() else {}
    key = lambda lat, lng: f'{lat:.4f},{lng:.4f}'
    todo = sorted({key(lat, lng) for lat, lng in points} - set(cache))
    for n in range(0, len(todo), 100):          # 100 locations per request, 1 request a second
        batch = todo[n:n + 100]
        for attempt in range(4):
            try:
                url = ELEVATION_URL + '?' + urllib.parse.urlencode({'locations': '|'.join(batch)})
                req = urllib.request.Request(url, headers={'User-Agent': 'DDAS-dam-alert-system/1.0 (zone builder)'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    results = json.load(r)['results']
                for k, res in zip(batch, results):
                    cache[k] = res.get('elevation')
                break
            except Exception as e:   # noqa: BLE001 - busy server: wait and retry
                if attempt == 3:
                    ELEVATION_CACHE.write_text(json.dumps(cache))
                    sys.exit(f'Elevation download failed ({e}). Re-run later (progress is saved) or use --no-terrain.')
                time.sleep(3 * (attempt + 1))
        ELEVATION_CACHE.write_text(json.dumps(cache))
        print(f'    elevation {min(n + 100, len(todo))}/{len(todo)}', flush=True)
        time.sleep(1.1)
    return {k: cache.get(k) for k in {key(lat, lng) for lat, lng in points}}, key


# ── Zone building ───────────────────────────────────────────────────────────────

def terrain_zones(river, total, lat0, reservoirs_xy):
    """Cells that flood per level, from ground height and connection to the river."""
    max_w = max(lv[5] for lv in LEVELS) * WIDTH_SCALE
    bed = [p for p in river if p[2] <= min(total, LEVELS[-1][2] * 1000)]
    # Candidate cells: within the widest band around the river
    cells = {}
    for x, y, d in bed[::2]:
        lv = level_at(d)
        if not lv:
            continue
        r = int(lv[5] * WIDTH_SCALE // CELL_M) + 1
        ci, cj = int(x // CELL_M), int(y // CELL_M)
        for i in range(ci - r, ci + r + 1):
            for j in range(cj - r, cj + r + 1):
                cells.setdefault((i, j), None)
    # Nearest river point for every cell (river points binned on the same grid for speed)
    bins = {}
    for p in bed:
        bins.setdefault((int(p[0] // (CELL_M * 5)), int(p[1] // (CELL_M * 5))), []).append(p)
    for c in list(cells):
        cx, cy = (c[0] + .5) * CELL_M, (c[1] + .5) * CELL_M
        bi, bj = int(cx // (CELL_M * 5)), int(cy // (CELL_M * 5))
        near = [p for di in range(-4, 5) for dj in range(-4, 5) for p in bins.get((bi + di, bj + dj), [])]
        best = min(near, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2) if near else None
        if best is None or math.hypot(best[0] - cx, best[1] - cy) > max_w:
            del cells[c]
        else:
            cells[c] = best

    # Ground height for cell centres and the river bed
    pts = [to_lnglat((c[0] + .5) * CELL_M, (c[1] + .5) * CELL_M, lat0)[::-1] for c in cells]
    pts += [to_lnglat(p[0], p[1], lat0)[::-1] for p in bed[::2]]
    print(f'  {len(cells)} terrain cells to check', flush=True)
    heights, key = elevations(pts)
    h = lambda x, y: heights.get(key(*to_lnglat(x, y, lat0)[::-1]))
    bed_height = {}
    for p in bed[::2]:
        bed_height[p[2]] = h(p[0], p[1])

    def floods(c):
        p = cells[c]
        lv = level_at(p[2])
        ground = h((c[0] + .5) * CELL_M, (c[1] + .5) * CELL_M)
        river_d = min(bed_height, key=lambda d: abs(d - p[2]))
        base = bed_height.get(river_d)
        if lv is None or ground is None or base is None:
            return False
        if math.hypot(p[0] - (c[0] + .5) * CELL_M, p[1] - (c[1] + .5) * CELL_M) > lv[5] * WIDTH_SCALE:
            return False
        f = (p[2] - lv[1] * 1000) / max(1, (lv[2] - lv[1]) * 1000)
        rise = (lv[3] + (lv[4] - lv[3]) * f) * RISE_SCALE
        cx, cy = (c[0] + .5) * CELL_M, (c[1] + .5) * CELL_M
        if any(inside(cx, cy, r) for r in reservoirs_xy):
            return False                       # already water: not a flood zone
        if math.hypot(p[0] - cx, p[1] - cy) <= RIVERSIDE_M:
            return True                        # riverbank strip is always included
        return ground <= base + rise

    # Grow outwards from the river through flooding cells only (connected to the river)
    seeds = [c for c in cells if math.hypot(cells[c][0] - (c[0] + .5) * CELL_M, cells[c][1] - (c[1] + .5) * CELL_M) <= CELL_M
             and floods(c)]
    wet, queue = set(seeds), deque(seeds)
    while queue:
        i, j = queue.popleft()
        for n in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if n in cells and n not in wet and floods(n):
                wet.add(n)
                queue.append(n)
    by_level = {}
    for c in wet:
        by_level.setdefault(level_at(cells[c][2])[0], set()).add(c)
    return by_level


def band_zones(river, total):
    """Fallback: cells within a widening band of the river (no elevation)."""
    by_level = {}
    for x, y, d in river:
        lv = level_at(d)
        if not lv or d > total:
            continue
        w = lv[5] * 0.5
        r = int(w // CELL_M)
        for i in range(int(x // CELL_M) - r, int(x // CELL_M) + r + 1):
            for j in range(int(y // CELL_M) - r, int(y // CELL_M) + r + 1):
                if math.hypot((i + .5) * CELL_M - x, (j + .5) * CELL_M - y) <= w:
                    by_level.setdefault(lv[0], set()).add((i, j))
    # A cell belongs to the first (most dangerous) level that reaches it
    seen = set()
    for level in sorted(by_level):
        by_level[level] -= seen
        seen |= by_level[level]
    return by_level


def main():
    global RISE_SCALE, WIDTH_SCALE, RIVERSIDE_M
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--no-terrain', action='store_true', help='Simple widening bands, no elevation download')
    parser.add_argument('--rise', type=float, default=1.0, help='Scale every water rise, e.g. 2 for bigger zones')
    parser.add_argument('--width', type=float, default=WIDTH_SCALE, help='Scale every maximum width (default 1.5)')
    parser.add_argument('--strip', type=float, default=RIVERSIDE_M, help='Metres each side of the river always included (default 500)')
    args = parser.parse_args()
    RISE_SCALE, WIDTH_SCALE, RIVERSIDE_M = args.rise, args.width, args.strip
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl

    dams = records("SELECT id, code, name, latitude, longitude, downstream_river_geojson g FROM dams "
                   "WHERE status <> 'decommissioned' AND downstream_river_geojson IS NOT NULL")
    levels = {int(r['level_number']): r['id'] for r in records('SELECT id, level_number FROM hazard_levels')}
    if any(lv[0] not in levels for lv in LEVELS):
        sys.exit('hazard_levels must have levels 1–5')
    reservoirs = [ring for r in records('SELECT reservoir_boundary_geojson g FROM dams WHERE reservoir_boundary_geojson IS NOT NULL')
                  for ring in rings_of(r['g'])]

    zones = []
    for dam in dams:
        lat0 = float(dam['latitude'])
        dam_xy = to_xy(float(dam['longitude']), lat0, lat0)
        xy = [to_xy(lng, lat, lat0) for lng, lat in lines_of(dam['g'])]
        if math.dist(xy[-1], dam_xy) < math.dist(xy[0], dam_xy):
            xy = xy[::-1]                       # the river must start at the dam
        river, total = densify(xy, CELL_M / 2)
        print(f'{dam["name"]}: river line {total / 1000:.1f} km', flush=True)
        res_xy = [[to_xy(lng, lat, lat0) for lng, lat in ring] for ring in reservoirs]
        by_level = band_zones(river, total) if args.no_terrain else terrain_zones(river, total, lat0, res_xy)
        prefix = CODES.get(dam['code'], dam['code'][:3].upper())
        for level, km0, km1, *_rest in LEVELS:
            eta, fill, stroke, opacity, name = _rest[3:]
            cells = by_level.get(level, set())
            rings = [chaikin([(i * CELL_M, j * CELL_M) for i, j in ring]) for ring in outlines(cells)]
            rings = [r for r in rings if len(r) > 8]
            if not rings:
                print(f'  L{level}: nothing ({"river line ends" if km0 * 1000 >= total else "no low ground"})')
                continue
            polygons = [[[to_lnglat(x, y, lat0) for x, y in r]] for r in rings]
            cx = sum((i + .5) * CELL_M for i, _ in cells) / len(cells)
            cy = sum((j + .5) * CELL_M for _, j in cells) / len(cells)
            lng, lat = to_lnglat(cx, cy, lat0)
            end_km = round(min(km1 * 1000, total) / 1000, 1)
            zones.append(dict(dam_id=int(dam['id']), level=level, code=f'{prefix}-RIVER-L{level}',
                              name=f'{dam["name"].replace(" Dam", "")} L{level} · {name} ({km0}–{end_km:g} km)',
                              geojson={'type': 'MultiPolygon', 'coordinates': polygons}, lat=lat, lng=lng,
                              km=round((km0 + end_km) / 2, 2), eta=eta, fill=fill, stroke=stroke, opacity=opacity))
            area = len(cells) * CELL_M * CELL_M / 1e6
            print(f'  L{level}: {km0}–{end_km:g} km · {area:.1f} km² · {len(polygons)} area(s) · water in ~{eta} min')

    if not args.apply:
        print(f'\nDry run: {len(zones)} zones for {len(dams)} dams. Re-run with --apply to replace the current zones.')
        return

    backup = Path.home() / f'ddas-zones-backup-{datetime.now():%Y%m%d-%H%M}.sql'
    backup.write_bytes(docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --no-tablespaces '
                              '--skip-triggers --set-gtid-purged=OFF $MYSQL_DATABASE dam_hazard_zones'))
    print(f'Old zones backed up to {backup}', flush=True)

    plan = Plan(columns(), foreign_keys(), None)
    plan.delete('dam_hazard_zones', 'dam_id IN (' + ','.join(str(int(d['id'])) for d in dams) + ')')
    statements = [(f'UPDATE `{t}` SET `{c}`=NULL WHERE {w}' if k == 'clear' else f'DELETE FROM `{t}` WHERE {w}')
                  for k, t, c, w in plan.steps]
    for z in zones:
        statements.append(
            'INSERT INTO dam_hazard_zones (dam_id, hazard_level_id, zone_code, zone_name, description, boundary_geojson, '
            'center_latitude, center_longitude, distance_from_dam_km, estimated_flood_arrival_minutes, fill_color, fill_opacity, '
            'stroke_color, stroke_width, display_order, show_label, is_active, is_verified) VALUES ('
            + ', '.join(map(quote, [z['dam_id'], levels[z['level']], z['code'], z['name'],
                                    'Illustrative demo zone from river terrain (SRTM) — not an official flood map.',
                                    z['geojson'], z['lat'], z['lng'], z['km'], z['eta'], z['fill'], z['opacity'],
                                    z['stroke'], 2, z['level'], 1, 1, 0])) + ')')
    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    print(f'Done: {len(zones)} zones created. Undo: restore {backup}')


if __name__ == '__main__':
    main()
