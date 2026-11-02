"""Demo responder teams for the mobile app: role RESPONDER and one team account per nearby police station,
hospital and fire station of each dam. Data only (no table or column changes); safe to run again.

The teams are simulated: DDAS never contacts the real police, hospitals or fire stations. A team account
is linked to its OpenStreetMap station (emergency_service_providers.metadata.responderUserId), so when an
operator assigns an SOS to that station on the evacuation page, the mission appears on the team's phone.

    python3 seed_responders.py --kubectl                     # create / update the teams
    python3 seed_responders.py --kubectl --password 'Xyz@2026!'
Needs the API (account sign-up) at --url and kubectl for the MySQL pod.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402

EMAIL_DOMAIN = 'responders.ddas.local'
DAMS = {'KOT-01': 'kot', 'VIC-01': 'vic', 'RAN-01': 'ran'}
SERVICES = [('police', 'Police team'), ('hospital', 'Ambulance'), ('fire_brigade', 'Fire team')]


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


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', default='ddas-db-0', metavar='POD')
    parser.add_argument('--url', default='http://localhost', help='Web/API address (default: on the server)')
    parser.add_argument('--password', default='Responder@2026', help='Password for every team account (min 8)')
    args = parser.parse_args()
    os.environ['DDAS_DB_POD'] = args.kubectl

    sql("INSERT IGNORE INTO roles (code, name, name_si, description, is_system_role, is_default, priority_level, color, is_active) "
        "VALUES ('RESPONDER', 'Emergency responder (demo)', 'හදිසි ප්‍රතිචාර කණ්ඩායම', "
        "'Simulated response team: sees SOS calls assigned to its station and navigates to the person', 0, 0, 40, '#0EA5E9', 1)")
    role = records("SELECT id FROM roles WHERE code = 'RESPONDER'")[0]['id']
    # Same base permissions as a normal user (dashboard, dams, alerts)
    sql(f"INSERT INTO role_permissions (role_id, permission_id) SELECT {role}, rp.permission_id FROM role_permissions rp "
        f"JOIN roles r ON r.id = rp.role_id WHERE r.code = 'NORMAL_USER' AND rp.permission_id NOT IN "
        f"(SELECT permission_id FROM (SELECT permission_id FROM role_permissions WHERE role_id = {role}) x)")

    dams = records('SELECT id, code, name, latitude lat, longitude lng FROM dams WHERE code IN ('
                   + ','.join(quote(c) for c in DAMS) + ')')
    teams = []
    for d in dams:
        for kind, label in SERVICES:
            # The station of this kind nearest to the dam
            rows = records(
                f"SELECT id, name FROM emergency_service_providers WHERE service_type = {quote(kind)} AND deleted_at IS NULL "
                f"ORDER BY POW(latitude - {float(d['lat'])}, 2) + POW((longitude - {float(d['lng'])}) * 0.99, 2) LIMIT 1")
            if not rows:
                print(f'  {d["name"]}: no {kind} station found, skipped')
                continue
            st = rows[0]
            email = f'{kind.split("_")[0]}-{DAMS[d["code"]]}@{EMAIL_DOMAIN}'
            name = f'{label} · {st["name"]} (demo)'[:100]
            state = sign_up(args.url, name, email, args.password)
            uid = records(f'SELECT id FROM users WHERE email = {quote(email)}')[0]['id']
            sql(f"UPDATE users SET role_id = {role}, full_name = {quote(name)}, preferred_dam_id = {d['id']}, "
                f"onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()) WHERE id = {uid}")
            sql(f"UPDATE emergency_service_providers SET metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), "
                f"'$.responderUserId', {uid}) WHERE id = {st['id']}")
            teams.append((d['name'], name, email, state))

    print(f'\nRole RESPONDER (id {role}). {len(teams)} demo team accounts, password: {args.password}\n')
    for dam, name, email, state in teams:
        print(f'  {dam:18} {email:34} {name}  [{state}]')
    print('\nSign in with one of these in the mobile app to see the responder screens.')


if __name__ == '__main__':
    main()
