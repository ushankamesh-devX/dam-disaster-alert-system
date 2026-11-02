"""Response teams for the mobile app: role RESPONDER and team accounts per dam (2 police, 2 ambulance,
1 fire & rescue), each linked to its OpenStreetMap station. Data only (no table or column changes);
safe to run again: existing teams keep their accounts and passwords and get the current names.

Training system: teams are DDAS accounts; the real police, hospitals and fire stations are never contacted.
A team account is linked to its station (emergency_service_providers.metadata.responderUserId), so when an
operator dispatches that station on the evacuation page, the mission appears on the team's phone.

Fire stations near the dams are rare in OpenStreetMap, so missing ones are added from up to --fire-km away
(add only: no existing station or shelter is removed).

    python3 seed_responders.py --kubectl
    python3 seed_responders.py --kubectl --password 'Xyz@2026!'
Needs the API (account sign-up) at --url and kubectl for the MySQL pod.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402
from seed_emergency_services import NS, SERVICES, ensure_location_types, place  # noqa: E402

EMAIL_DOMAIN = 'responders.ddas.local'
DAMS = {'KOT-01': 'kot', 'VIC-01': 'vic', 'RAN-01': 'ran'}
TEAMS = [('police', 'Police team', 2), ('hospital', 'Ambulance', 2), ('fire_brigade', 'Fire & rescue', 1)]
MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
           'https://maps.mail.ru/osm/tools/overpass/api/interpreter']


def km(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    return math.hypot((b[1] - a[1]) * 111.32 * math.cos(lat), (b[0] - a[0]) * 110.54)


def sign_up(url, name, email, password):
    body = json.dumps({'fullName': name, 'email': email, 'password': password, 'languagePreference': 'en'}).encode()
    req = urllib.request.Request(url.rstrip('/') + '/api/v1/auth/register', data=body, method='POST',
                                 headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        return 'created'
    except urllib.error.HTTPError as e:
        if e.code in (400, 409):   # already registered
            return 'exists'
        raise


def add_fire_stations(dams, radius_km):
    """Fire stations within radius_km of each dam that are not loaded yet (add only)."""
    pad = radius_km / 111
    s, w = min(d['pt'][0] for d in dams) - pad, min(d['pt'][1] for d in dams) - pad
    n, e = max(d['pt'][0] for d in dams) + pad, max(d['pt'][1] for d in dams) + pad
    query = (f'[out:json][timeout:90];(node["amenity"="fire_station"]({s},{w},{n},{e});'
             f'way["amenity"="fire_station"]({s},{w},{n},{e}););out center tags;')
    elements = None
    for attempt, url in enumerate(MIRRORS * 2):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': query}).encode(),
                                         headers={'User-Agent': 'DDAS-dam-alert-system/1.0 (seed script)'})
            with urllib.request.urlopen(req, timeout=120) as r:
                elements = json.load(r)['elements']
            break
        except Exception as err:   # noqa: BLE001 - Overpass is often busy: try the next mirror
            print(f'  {url} failed ({err}); retrying ...', flush=True)
            time.sleep(5 * (attempt + 1))
    if elements is None:
        print('  Could not download fire stations; continuing without them.')
        return
    have = {r['code'] for r in records("SELECT code FROM emergency_service_providers WHERE code LIKE 'OSM-%'")}
    types = ensure_location_types()
    stype, ltype, colour, label = SERVICES['fire_station']
    added = 0
    for p in filter(None, map(place, elements)):
        code = 'OSM-' + p['osm'].replace('/', '-')
        if code in have or min(km(d['pt'], (p['lat'], p['lng'])) for d in dams) > radius_km:
            continue
        sql('INSERT INTO emergency_service_providers (uuid, code, name, name_si, description, service_type, location_type_id, '
            'address_text, latitude, longitude, primary_phone, emergency_phone, is_24_hours, status, is_verified, show_on_map, marker_color, metadata) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid5(NS, p['osm'])), code, p['name'], p['name_si'],
                                    f'{label} location from OpenStreetMap ({p["osm"]}).', stype, types.get(ltype), p['address'],
                                    p['lat'], p['lng'], '', None, 1, 'active', 0, 1, colour,
                                    {'source': 'OpenStreetMap', 'osm': p['osm'], 'licence': 'ODbL'}])) + ')')
        added += 1
    print(f'  {added} fire station(s) added from OpenStreetMap within {radius_km:g} km')


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', default='ddas-db-0', metavar='POD')
    parser.add_argument('--url', default='http://localhost', help='Web/API address (default: on the server)')
    parser.add_argument('--password', default='Responder@2026', help='Password for new team accounts (min 8)')
    parser.add_argument('--fire-km', type=float, default=40, help='How far to look for fire stations')
    args = parser.parse_args()
    os.environ['DDAS_DB_POD'] = args.kubectl

    sql("INSERT IGNORE INTO roles (code, name, name_si, description, is_system_role, is_default, priority_level, color, is_active) "
        "VALUES ('RESPONDER', 'Emergency responder', 'හදිසි ප්‍රතිචාර කණ්ඩායම', "
        "'Response team: gets SOS missions for its station and navigates to the person', 0, 0, 40, '#0EA5E9', 1)")
    sql("UPDATE roles SET name = 'Emergency responder', "
        "description = 'Response team: gets SOS missions for its station and navigates to the person' WHERE code = 'RESPONDER'")
    role = records("SELECT id FROM roles WHERE code = 'RESPONDER'")[0]['id']
    # Same base permissions as a normal user (dashboard, dams, alerts)
    sql(f"INSERT INTO role_permissions (role_id, permission_id) SELECT {role}, rp.permission_id FROM role_permissions rp "
        f"JOIN roles r ON r.id = rp.role_id WHERE r.code = 'NORMAL_USER' AND rp.permission_id NOT IN "
        f"(SELECT permission_id FROM (SELECT permission_id FROM role_permissions WHERE role_id = {role}) x)")

    dams = records('SELECT id, code, name, latitude lat, longitude lng FROM dams WHERE code IN ('
                   + ','.join(quote(c) for c in DAMS) + ')')
    for d in dams:
        d['pt'] = (float(d['lat']), float(d['lng']))

    # Older loads said 'not connected to DDAS' on every station; the map shows plain station details now
    sql("UPDATE emergency_service_providers SET description = REPLACE(description, ' Shown on the map only; not connected to DDAS.', '') "
        "WHERE description LIKE '%not connected to DDAS%'")

    print('Fire stations ...', flush=True)
    add_fire_stations(dams, args.fire_km)

    stations = records("SELECT id, name, service_type type, latitude lat, longitude lng, "
                       "JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.responderUserId')) uid "
                       "FROM emergency_service_providers WHERE deleted_at IS NULL")
    used = set()        # one team per station, even when two dams share the same town
    teams = []
    for d in dams:
        for kind, label, count in TEAMS:
            near = sorted((s for s in stations if s['type'] == kind),
                          key=lambda s: km(d['pt'], (float(s['lat']), float(s['lng']))))
            picked = [s for s in near if s['id'] not in used][:count]
            if not picked:
                print(f'  {d["name"]}: no {label.lower()} station found, skipped')
            for i, st in enumerate(picked):
                used.add(st['id'])
                tag = kind.split('_')[0] + ('' if i == 0 else str(i + 1))
                email = f'{tag}-{DAMS[d["code"]]}@{EMAIL_DOMAIN}'
                name = f'{label} · {st["name"]}'[:100]
                state = sign_up(args.url, name, email, args.password)
                uid = records(f'SELECT id FROM users WHERE email = {quote(email)}')[0]['id']
                sql(f"UPDATE users SET role_id = {role}, full_name = {quote(name)}, preferred_dam_id = {d['id']}, "
                    f"onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), status = 'active' WHERE id = {uid}")
                # Unlink this account from any other station first, then link it here
                sql(f"UPDATE emergency_service_providers SET metadata = JSON_REMOVE(metadata, '$.responderUserId') "
                    f"WHERE JSON_EXTRACT(metadata, '$.responderUserId') = {uid} AND id <> {st['id']}")
                sql(f"UPDATE emergency_service_providers SET metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), "
                    f"'$.responderUserId', {uid}) WHERE id = {st['id']}")
                dist = km(d['pt'], (float(st['lat']), float(st['lng'])))
                teams.append((d['name'], label, email, name, dist, state))

    print(f'\nRole RESPONDER (id {role}). {len(teams)} team accounts. New accounts use the password: {args.password}\n')
    for dam, label, email, name, dist, state in teams:
        print(f'  {dam:16} {label:14} {email:36} {name}  ({dist:.1f} km, {state})')
    print('\nSign in with one of these in the mobile app for the team screens.')


if __name__ == '__main__':
    main()
