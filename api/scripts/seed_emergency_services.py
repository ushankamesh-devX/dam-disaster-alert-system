"""Load real police stations, hospitals, fire stations and shelters near the dams from OpenStreetMap.

    python3 seed_emergency_services.py --kubectl              # dry run: what would be loaded
    python3 seed_emergency_services.py --kubectl --apply      # replace services and shelters

Data only (no schema change). Downloads once from the Overpass API (OpenStreetMap, ODbL):
- emergency_service_providers: police, hospitals and clinics, fire stations, as map locations only.
  DDAS is a demo: no phone numbers are stored and nothing contacts these services.
- system_safe_locations: up to --shelters-per-dam named schools, temples, mosques, churches and
  community halls near each dam that lie outside every danger zone. Capacities are estimates.
Existing service providers and shelters are replaced (their links are cleared, like cleanup_demo_data.py).
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402
from cleanup_demo_data import Plan, columns, foreign_keys  # noqa: E402

OVERPASS = 'https://overpass-api.de/api/interpreter'
NS = uuid.UUID('6f1d3a52-0c47-4e3e-9a55-6a1f3c9b7d21')

SERVICES = {  # OSM amenity -> (service_type, location type code, marker colour, label)
    'police': ('police', 'police_station', '#1E40AF', 'Police'),
    'hospital': ('hospital', 'hospital', '#DC2626', 'Hospital'),
    'clinic': ('hospital', 'clinic', '#EF4444', 'Clinic'),
    'fire_station': ('fire_brigade', 'fire_station', '#EA580C', 'Fire station'),
}
SHELTERS = {  # (amenity, religion or None) -> (location type code, capacity estimate)
    ('school', None): ('school', 400),
    ('community_centre', None): ('community_hall', 250),
    ('place_of_worship', 'buddhist'): ('temple', 200),
    ('place_of_worship', 'hindu'): ('temple', 200),
    ('place_of_worship', 'muslim'): ('mosque', 200),
    ('place_of_worship', 'christian'): ('church', 150),
}


def distance_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def inside(lat, lng, ring):
    hit = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]
        x2, y2 = ring[i]
        if (y1 > lat) != (y2 > lat) and lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def outer_rings(geojson):
    try:
        g = json.loads(geojson) if isinstance(geojson, str) else geojson
        g = g.get('geometry', g)
        if g['type'] == 'Polygon':
            return [g['coordinates'][0]]
        if g['type'] == 'MultiPolygon':
            return [p[0] for p in g['coordinates']]
    except Exception:
        pass
    return []


MIRRORS = [OVERPASS, 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
CACHE = Path.home() / '.ddas-osm-places.json'


# Location types this script uses: code -> (name, category, evacuation point, marker colour)
LOCATION_TYPES = {
    'school': ('School', 'shelter', 1, '#7C3AED'),
    'temple': ('Temple', 'religious', 1, '#F59E0B'),
    'mosque': ('Mosque', 'religious', 1, '#059669'),
    'church': ('Church', 'religious', 1, '#0EA5E9'),
    'community_hall': ('Community Hall', 'shelter', 1, '#0EA5E9'),
    'police_station': ('Police Station', 'emergency_service', 0, '#1E40AF'),
    'hospital': ('Hospital', 'medical', 0, '#DC2626'),
    'clinic': ('Clinic', 'medical', 0, '#EF4444'),
    'fire_station': ('Fire Station', 'emergency_service', 0, '#EA580C'),
}


def ensure_location_types():
    """Add any missing location types (data only) and return {code: id}."""
    have = {r['code']: r['id'] for r in records('SELECT id, code FROM location_types')}
    missing = [c for c in LOCATION_TYPES if c not in have]
    if missing:
        sql('INSERT INTO location_types (code, name, category, is_evacuation_point, marker_color, is_active) VALUES '
            + ', '.join(f'({quote(c)}, {quote(LOCATION_TYPES[c][0])}, {quote(LOCATION_TYPES[c][1])}, '
                        f'{LOCATION_TYPES[c][2]}, {quote(LOCATION_TYPES[c][3])}, 1)' for c in missing))
        print(f'  added location types: {", ".join(missing)}', flush=True)
        have = {r['code']: r['id'] for r in records('SELECT id, code FROM location_types')}
    return have


def overpass(bbox):
    """Download once; the dry run's result is cached so --apply doesn't depend on Overpass being up."""
    s, w, n, e = bbox
    key = [round(v, 4) for v in bbox]
    if CACHE.exists():
        cached = json.loads(CACHE.read_text())
        if cached.get('bbox') == key:
            print(f'  using the download saved in {CACHE}', flush=True)
            return cached['elements']
    amenities = '|'.join(sorted(set(SERVICES) | {a for a, _ in SHELTERS}))
    query = (f'[out:json][timeout:90];(node["amenity"~"^({amenities})$"]({s},{w},{n},{e});'
             f'way["amenity"~"^({amenities})$"]({s},{w},{n},{e}););out center tags;')
    last = None
    for attempt, url in enumerate(MIRRORS * 2):     # each mirror twice; Overpass is often busy (502/504/429)
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': query}).encode(),
                                         headers={'User-Agent': 'DDAS-dam-alert-system/1.0 (seed script)'})
            with urllib.request.urlopen(req, timeout=120) as r:
                elements = json.load(r)['elements']
            CACHE.write_text(json.dumps({'bbox': key, 'elements': elements}))
            return elements
        except Exception as err:   # noqa: BLE001 - any network/server error: try the next mirror
            last = err
            print(f'  {url} failed ({err}); retrying ...', flush=True)
            time.sleep(5 * (attempt + 1))
    sys.exit(f'Could not download from OpenStreetMap: {last}')


def place(el):
    tags = el.get('tags', {})
    lat = el.get('lat') or el.get('center', {}).get('lat')
    lng = el.get('lon') or el.get('center', {}).get('lon')
    name = tags.get('name:en') or tags.get('name')
    if lat is None or not name:
        return None
    address = ', '.join(v for v in (tags.get('addr:street'), tags.get('addr:city') or tags.get('addr:place')) if v)
    return dict(osm=f'{el["type"]}/{el["id"]}', lat=float(lat), lng=float(lng), name=name[:200],
                name_si=tags.get('name:si'), amenity=tags.get('amenity'), religion=tags.get('religion'),
                address=address[:500] or None)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD')
    parser.add_argument('--apply', action='store_true', help='Replace services and shelters (default: dry run)')
    parser.add_argument('--shelters-per-dam', type=int, default=6)
    parser.add_argument('--radius-km', type=float, default=15, help='Search radius around each dam')
    args = parser.parse_args()
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl

    dams = records("SELECT id, name, latitude, longitude FROM dams WHERE status <> 'decommissioned' AND latitude IS NOT NULL")
    if not dams:
        sys.exit('No dams with coordinates.')
    for d in dams:
        d['pt'] = (float(d['latitude']), float(d['longitude']))
    zones = [ring for z in records('SELECT boundary_geojson g FROM dam_hazard_zones WHERE is_active = 1')
             for ring in outer_rings(z['g'])]
    pad = args.radius_km / 111
    bbox = (min(d['pt'][0] for d in dams) - pad, min(d['pt'][1] for d in dams) - pad,
            max(d['pt'][0] for d in dams) + pad, max(d['pt'][1] for d in dams) + pad)

    print(f'Downloading OpenStreetMap places around {", ".join(d["name"] for d in dams)} ...', flush=True)
    places = [p for p in map(place, overpass(bbox)) if p]

    def nearest_dam(p):
        return min(dams, key=lambda d: distance_km(d['pt'], (p['lat'], p['lng'])))

    services = []
    for p in places:
        if p['amenity'] not in SERVICES:
            continue
        dam = nearest_dam(p)
        if distance_km(dam['pt'], (p['lat'], p['lng'])) > args.radius_km:
            continue
        services.append(p)

    shelters = []
    for dam in dams:
        candidates = []
        for p in places:
            key = (p['amenity'], p['religion'] if p['amenity'] == 'place_of_worship' else None)
            if key not in SHELTERS or nearest_dam(p) is not dam:
                continue
            km = distance_km(dam['pt'], (p['lat'], p['lng']))
            if km > args.radius_km or any(inside(p['lat'], p['lng'], r) for r in zones):
                continue
            candidates.append((km, p, key))
        # Nearest first, but no two shelters within 300 m of each other
        chosen = []
        for km, p, key in sorted(candidates, key=lambda c: c[0]):
            if all(distance_km((p['lat'], p['lng']), (c['lat'], c['lng'])) > 0.3 for _, c, _ in chosen):
                chosen.append((km, p, key))
            if len(chosen) == args.shelters_per_dam:
                break
        shelters += [(dam, km, p, key) for km, p, key in chosen]

    print(f'  {len(services)} emergency services: ' + ', '.join(
        f'{sum(1 for s in services if SERVICES[s["amenity"]][3] == label)} {label.lower()}'
        for label in sorted({v[3] for v in SERVICES.values()})))
    print(f'  {len(shelters)} shelters outside the danger zones:')
    for dam, km, p, key in shelters:
        print(f'    {dam["name"]:<16} {km:5.1f} km  {SHELTERS[key][0]:<15} {p["name"]}')
    if not args.apply:
        print('\nDry run. Re-run with --apply to replace the current services and shelters.')
        return

    types = ensure_location_types()
    cols, graph = columns(), foreign_keys()
    plan = Plan(cols, graph, keeper_user_id=None)
    plan.delete('emergency_service_providers', '1=1')
    plan.delete('system_safe_locations', '1=1')
    statements = []
    for kind, table, col, where in plan.steps:
        statements.append(f'UPDATE `{table}` SET `{col}`=NULL WHERE {where}' if kind == 'clear'
                          else f'DELETE FROM `{table}` WHERE {where}')

    for p in services:
        stype, ltype, colour, label = SERVICES[p['amenity']]
        statements.append(
            'INSERT INTO emergency_service_providers (uuid, code, name, name_si, description, service_type, location_type_id, '
            'address_text, latitude, longitude, primary_phone, emergency_phone, is_24_hours, status, is_verified, show_on_map, marker_color, metadata) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid5(NS, p['osm'])), 'OSM-' + p['osm'].replace('/', '-'), p['name'], p['name_si'],
                                    f'{label} location from OpenStreetMap ({p["osm"]}).',
                                    stype, types.get(ltype), p['address'], p['lat'], p['lng'], '', None, 1, 'active', 0, 1, colour,  # demo: no phone numbers
                                    {'source': 'OpenStreetMap', 'osm': p['osm'], 'licence': 'ODbL'}])) + ')')
    for dam, km, p, key in shelters:
        ltype, capacity = SHELTERS[key]
        statements.append(
            'INSERT INTO system_safe_locations (uuid, code, name, name_si, description, location_type_id, address_text, latitude, longitude, '
            'capacity_persons, current_occupancy, primary_dam_id, distance_from_dam_km, status, is_verified, show_on_map, emergency_phone) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid5(NS, 'shelter:' + p['osm'])), 'OSM-' + p['osm'].replace('/', '-'), p['name'], p['name_si'],
                                    f'Evacuation shelter from OpenStreetMap ({p["osm"]}). Capacity {capacity} is an estimate.',
                                    types.get(ltype) or types.get('shelter'), p['address'], p['lat'], p['lng'], capacity, 0,
                                    int(dam['id']), round(km, 2), 'active', 0, 1, None])) + ')')

    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    from evacuation_scenario import ensure_sos_types   # SOS types the mobile app can send
    ensure_sos_types()
    print(f'Done: {len(services)} services and {len(shelters)} shelters loaded, SOS types ready. '
          'Map data © OpenStreetMap contributors.')


if __name__ == '__main__':
    main()
