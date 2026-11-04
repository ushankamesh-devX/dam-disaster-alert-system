"""Response units for the mobile app: role RESPONDER and unit accounts per dam, all based near the dam.

Per dam (within --max-km of the dam): 3 police units at the nearest police stations, 2 ambulances at the
nearest hospitals, and 2 fire & rescue units at rescue posts in the dam's towns (OpenStreetMap has no fire
station near these dams; the posts sit next to the town police stations). Units far away are unlinked.
Data only (no table or column changes); safe to run again: existing accounts keep their passwords.

Training system: units are DDAS accounts; the real police, hospitals and fire stations are never contacted.
A station lists its units in emergency_service_providers.metadata.responderUserIds; when an operator
dispatches a unit on the evacuation page, the job appears on that unit's phone.

    python3 seed_responders.py --kubectl
    python3 seed_responders.py --kubectl --password 'Xyz@2026!'
Needs the API (account sign-up) at --url and kubectl for the MySQL pod.
"""
import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402
from seed_emergency_services import NS, SERVICES, ensure_location_types  # noqa: E402

EMAIL_DOMAIN = 'responders.ddas.local'
DAMS = {'KOT-01': 'kot', 'VIC-01': 'vic', 'RAN-01': 'ran'}
# kind, label, units per dam
UNITS = [('police', 'Police', 3), ('hospital', 'Ambulance', 2), ('fire_brigade', 'Fire & rescue', 2)]
# Forward posts at the dam's high-ground assembly points (next to the danger zones, on a road):
# kind, label, units; they reach people in the zones in about 10-15 minutes
FORWARD = [('hospital', 'Ambulance', 2), ('fire_brigade', 'Fire & rescue', 1), ('police', 'Police', 1)]
SERVICE_KEY = {'police': 'police', 'hospital': 'hospital', 'fire_brigade': 'fire_station'}


def km(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    return math.hypot((b[1] - a[1]) * 111.32 * math.cos(lat), (b[0] - a[0]) * 110.54)


def town(name):
    """'Teldeniya Police Station' -> 'Teldeniya'; 'Fire & rescue post · Teldeniya' -> 'Teldeniya'; 'Base Hospital of Walapane' -> 'Walapane'."""
    t = name.split('·')[-1]
    t = re.sub(r'\b(police|station|post|divisional|crime|detective|bureau|base|hospital|rural|district|general|of)\b', '', t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip(' -,·')
    return t or name


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


def rescue_post(dam, n, base, types):
    """A fire & rescue post next to a town police station (upsert by code). Returns its station row."""
    stype, ltype, colour, _ = SERVICES['fire_station']
    code = f'DDAS-POST-{dam["code"]}-{n}'
    name = f'Fire & rescue post · {town(base["name"])}'
    lat, lng = float(base['lat']) + 0.0009, float(base['lng']) + 0.0009   # about 130 m from the police station
    if records(f'SELECT id FROM emergency_service_providers WHERE code = {quote(code)}'):
        sql(f'UPDATE emergency_service_providers SET name = {quote(name)}, latitude = {lat}, longitude = {lng}, '
            f"deleted_at = NULL, status = 'active', show_on_map = 1 WHERE code = {quote(code)}")
    else:
        sql('INSERT INTO emergency_service_providers (uuid, code, name, description, service_type, location_type_id, '
            'latitude, longitude, primary_phone, is_24_hours, status, is_verified, show_on_map, marker_color, metadata) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid5(NS, code)), code, name,
                                    f'DDAS rescue post for {dam["name"]} (training data).', stype, types.get(ltype),
                                    lat, lng, '', 1, 'active', 0, 1, colour, {'source': 'DDAS'}])) + ')')
    return records(f'SELECT id, name, service_type type, latitude lat, longitude lng FROM emergency_service_providers '
                   f'WHERE code = {quote(code)}')[0]


def forward_post(dam, kind, n, point, types):
    """A forward post (ambulance / fire & rescue / police) at a high-ground assembly point (upsert by code)."""
    stype, ltype, colour, _ = SERVICES[SERVICE_KEY[kind]]
    code = f'DDAS-FWD-{dam["code"]}-{kind}-{n}'
    place = re.sub(r'^High ground [A-Z]:\s*(near\s+)?', '', point['name']).strip() or point['name']
    label = {'hospital': 'Ambulance post', 'fire_brigade': 'Rescue post', 'police': 'Police post'}[kind]
    name = f'{label} · {place}'[:200]
    offset = {'hospital': 0.0006, 'fire_brigade': -0.0006, 'police': 0.0}[kind]     # side by side, not on top of each other
    lat, lng = float(point['lat']) + offset, float(point['lng']) + 0.0006
    if records(f'SELECT id FROM emergency_service_providers WHERE code = {quote(code)}'):
        sql(f'UPDATE emergency_service_providers SET name = {quote(name)}, latitude = {lat}, longitude = {lng}, '
            f"deleted_at = NULL, status = 'active', show_on_map = 1 WHERE code = {quote(code)}")
    else:
        sql('INSERT INTO emergency_service_providers (uuid, code, name, description, service_type, location_type_id, '
            'latitude, longitude, primary_phone, is_24_hours, status, is_verified, show_on_map, marker_color, metadata) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid5(NS, code)), code, name,
                                    f'DDAS forward post for {dam["name"]} at {point["name"]} (training data).', stype, types.get(ltype),
                                    lat, lng, '', 1, 'active', 0, 1, colour, {'source': 'DDAS'}])) + ')')
    return records(f'SELECT id, name, service_type type, latitude lat, longitude lng FROM emergency_service_providers '
                   f'WHERE code = {quote(code)}')[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', default='ddas-db-0', metavar='POD')
    parser.add_argument('--url', default='http://localhost', help='Web/API address (default: on the server)')
    parser.add_argument('--password', default='Responder@2026', help='Password for new unit accounts (min 8)')
    parser.add_argument('--max-km', type=float, default=20, help='Units are based at most this far from their dam')
    args = parser.parse_args()
    os.environ['DDAS_DB_POD'] = args.kubectl

    sql("INSERT IGNORE INTO roles (code, name, name_si, description, is_system_role, is_default, priority_level, color, is_active) "
        "VALUES ('RESPONDER', 'Emergency responder', 'හදිසි ප්‍රතිචාර කණ්ඩායම', "
        "'Response unit: gets SOS jobs for its station and navigates to the person', 0, 0, 40, '#0EA5E9', 1)")
    sql("UPDATE roles SET name = 'Emergency responder', "
        "description = 'Response unit: gets SOS jobs for its station and navigates to the person' WHERE code = 'RESPONDER'")
    role = records("SELECT id FROM roles WHERE code = 'RESPONDER'")[0]['id']
    # Same base permissions as a normal user (dashboard, dams, alerts)
    sql(f"INSERT INTO role_permissions (role_id, permission_id) SELECT {role}, rp.permission_id FROM role_permissions rp "
        f"JOIN roles r ON r.id = rp.role_id WHERE r.code = 'NORMAL_USER' AND rp.permission_id NOT IN "
        f"(SELECT permission_id FROM (SELECT permission_id FROM role_permissions WHERE role_id = {role}) x)")
    sql("UPDATE emergency_service_providers SET description = REPLACE(description, ' Shown on the map only; not connected to DDAS.', '') "
        "WHERE description LIKE '%not connected to DDAS%'")

    # Start clean: no station has units until this run links them again
    sql("UPDATE emergency_service_providers SET metadata = JSON_REMOVE(JSON_REMOVE(metadata, '$.responderUserId'), '$.responderUserIds') "
        "WHERE JSON_CONTAINS_PATH(metadata, 'one', '$.responderUserId', '$.responderUserIds')")

    dams = records('SELECT id, code, name, latitude lat, longitude lng FROM dams WHERE code IN ('
                   + ','.join(quote(c) for c in DAMS) + ')')
    for d in dams:
        d['pt'] = (float(d['lat']), float(d['lng']))
    stations = records("SELECT id, name, service_type type, latitude lat, longitude lng FROM emergency_service_providers "
                       "WHERE deleted_at IS NULL AND code NOT LIKE 'DDAS-POST-%' AND code NOT LIKE 'DDAS-FWD-%'")
    types = ensure_location_types()

    links = {}          # station id -> [user ids]
    used = set()        # a station near two dams serves only the first one
    units = []
    for d in sorted(dams, key=lambda x: x['code']):
        def near(kind):
            rows = [s for s in stations if s['type'] == kind and s['id'] not in used
                    and km(d['pt'], (float(s['lat']), float(s['lng']))) <= args.max_km]
            return sorted(rows, key=lambda s: km(d['pt'], (float(s['lat']), float(s['lng']))))

        police = near('police')
        for kind, label, count in UNITS:
            if kind == 'fire_brigade':
                bases = [rescue_post(d, i + 1, police[i % len(police)], types) for i in range(count)] if police else []
            else:
                pool = near(kind)
                if not pool and kind == 'hospital' and police:
                    pool = police[:1]         # no hospital near: the ambulance waits at the town police station
                bases = [pool[i % len(pool)] for i in range(count)] if pool else []
            if not bases:
                print(f'  {d["name"]}: no {label.lower()} base within {args.max_km:g} km, skipped')
                continue
            for i, st in enumerate(bases):
                used.add(st['id'])
                tag = kind.split('_')[0] + ('' if i == 0 else str(i + 1))
                email = f'{tag}-{DAMS[d["code"]]}@{EMAIL_DOMAIN}'
                name = f'{label} {i + 1} · {town(st["name"])}'[:100]
                state = sign_up(args.url, name, email, args.password)
                uid = records(f'SELECT id FROM users WHERE email = {quote(email)}')[0]['id']
                sql(f"UPDATE users SET role_id = {role}, full_name = {quote(name)}, preferred_dam_id = {d['id']}, "
                    f"onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), status = 'active' WHERE id = {uid}")
                links.setdefault(st['id'], []).append(int(uid))
                units.append((d['name'], label, email, name, st['name'], km(d['pt'], (float(st['lat']), float(st['lng']))), state))

        # Forward posts at the high-ground assembly points next to the zones (from build_safe_areas.py)
        points = records(f"SELECT name, latitude lat, longitude lng FROM system_safe_locations WHERE code LIKE "
                         f"{quote('HG-' + d['code'].split('-')[0] + '-%')} AND deleted_at IS NULL ORDER BY code")
        if not points:
            print(f'  {d["name"]}: no high-ground assembly points (run build_safe_areas.py), no forward posts')
        base_count = {k: c for k, _, c in UNITS}
        for kind, label, count in FORWARD if points else []:
            for i in range(count):
                point = points[i % len(points)] if kind == 'hospital' else points[min(1, len(points) - 1)]
                st = forward_post(d, kind, i + 1, point, types)
                n = base_count[kind] + i + 1
                tag = kind.split('_')[0] + str(n)
                email = f'{tag}-{DAMS[d["code"]]}@{EMAIL_DOMAIN}'
                name = f'{label} {n} · {town(st["name"])}'[:100]
                state = sign_up(args.url, name, email, args.password)
                uid = records(f'SELECT id FROM users WHERE email = {quote(email)}')[0]['id']
                sql(f"UPDATE users SET role_id = {role}, full_name = {quote(name)}, preferred_dam_id = {d['id']}, "
                    f"onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), status = 'active' WHERE id = {uid}")
                links.setdefault(st['id'], []).append(int(uid))
                units.append((d['name'], label + ' (forward)', email, name, st['name'], km(d['pt'], (float(st['lat']), float(st['lng']))), state))

    for sid, uids in links.items():
        sql(f"UPDATE emergency_service_providers SET metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), "
            f"'$.responderUserIds', CAST({quote(json.dumps(uids))} AS JSON)) WHERE id = {sid}")
    # Accounts from earlier runs that have no base any more (e.g. a far fire station) stay as plain users
    kept = {u for uids in links.values() for u in uids}
    old = records(f"SELECT id, email FROM users WHERE email LIKE '%@{EMAIL_DOMAIN}' AND role_id = {role}")
    for o in old:
        if int(o['id']) not in kept:
            sql(f"UPDATE users SET status = 'inactive' WHERE id = {o['id']}")
            print(f'  {o["email"]}: no base near a dam now, account switched off')

    print(f'\nRole RESPONDER (id {role}). {len(units)} units. New accounts use the password: {args.password}\n')
    for dam, label, email, name, base, dist, state in units:
        print(f'  {dam:16} {email:36} {name:42} {dist:4.1f} km from the dam  [{state}]')
    print('\nSign in with one of these in the mobile app for the unit screens.')


if __name__ == '__main__':
    main()
