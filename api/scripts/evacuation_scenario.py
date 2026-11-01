"""Live evacuation scenario for demos: people leave the danger zones of one dam and walk or drive
to shelters while the command center (Evacuation page) shows them moving.

    python3 evacuation_scenario.py --dam victoria                     # 10 minutes, 80 people
    python3 evacuation_scenario.py --dam kotmale --people 80 --minutes 6
    python3 evacuation_scenario.py --reset                            # remove everything it created

Run on the server (needs kubectl for the MySQL pod and the API at --url). What happens:
1. The dam is set to 'high' hazard: its evacuation zones become active. An Evacuation Order is raised
   as a drill, so it never sends SMS.
2. Simulated residents appear inside the zones and share their location. Each asks the routing
   API for a route and moves along it (sped up by --speedup) to the shelter it was given.
3. About 1 in 20 residents send an SOS (trapped, injured, medical). Each SOS is acknowledged,
   given a simulated responder team near the closest police station or hospital, and resolved, then the person moves on.
4. Part way through a bridge on a busy route is blocked; residents still before it are re-routed.
5. Arrivals fill the shelters. At the end the dam goes back to its previous status, All Clear is
   raised and a summary is printed.
All created rows are synthetic and tagged (users @scenario.ddas.local, alerts and blocked roads
listed in ~/.ddas-scenario.json); --reset deletes them. Data only: no schema change.
"""
import argparse
import json
import math
import os
import random
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402
from cleanup_demo_data import Plan, columns, foreign_keys  # noqa: E402
from ddas_feeder import Api  # noqa: E402

STATE = Path.home() / '.ddas-scenario.json'
EMAIL_DOMAIN = 'scenario.ddas.local'
DAM_CODES = {'kotmale': 'KOT-01', 'victoria': 'VIC-01', 'randenigala': 'RAN-01'}
SOS_KINDS = [('flood_trapped', 'Trapped by flood water', 'Water around the house, cannot get out'),
             ('injured', 'Injured', 'Hurt while leaving, need help to walk'),
             ('medical', 'Medical emergency', 'Elderly person needs medical help'),
             ('stranded_vehicle', 'Vehicle stranded', 'Car stuck on a flooded road')]
TICK = 5            # seconds between position updates
WALK_MPS, DRIVE_MPS = 1.3, 9.0


def log(msg):
    print(f'{datetime.now():%H:%M:%S} {msg}', flush=True)


def metres(a, b):
    """Distance between [lng, lat] points in metres."""
    lat = math.radians((a[1] + b[1]) / 2)
    return math.hypot((b[0] - a[0]) * 111320 * math.cos(lat), (b[1] - a[1]) * 110540)


def ring_of(geojson):
    g = json.loads(geojson) if isinstance(geojson, str) else geojson
    g = g.get('geometry', g)
    return g['coordinates'][0] if g['type'] == 'Polygon' else g['coordinates'][0][0]


def inside(lng, lat, ring):
    hit = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]
        x2, y2 = ring[i]
        if (y1 > lat) != (y2 > lat) and lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def random_point(rng, ring):
    xs, ys = [p[0] for p in ring], [p[1] for p in ring]
    for _ in range(5000):
        lng, lat = rng.uniform(min(xs), max(xs)), rng.uniform(min(ys), max(ys))
        if inside(lng, lat, ring):
            return lng, lat
    raise RuntimeError('Could not place a resident inside the zone')


def admin_api(url):
    for key in ('DDAS_ADMIN_EMAIL', 'DDAS_ADMIN_PASSWORD'):
        if not os.environ.get(key):
            out = subprocess.run(['kubectl', '-n', 'ddas', 'get', 'secret', 'ddas-secrets', '-o',
                                  f'jsonpath={{.data.{key}}}'], capture_output=True, text=True, check=True).stdout
            os.environ[key] = subprocess.run(['base64', '-d'], input=out, capture_output=True, text=True).stdout
    api = Api(url)
    api.login()
    return api


def save_state(state):
    STATE.write_text(json.dumps(state, indent=2))


def load_state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


class Resident:
    def __init__(self, rid, user_id, session_id, name, lng, lat, mode):
        self.id, self.user_id, self.session_id, self.name = rid, user_id, session_id, name
        self.pos, self.mode = [lng, lat], mode
        self.path, self.step, self.shelter_id = [], 0, None
        self.state = 'waiting'        # waiting -> moving -> sos -> moving -> arrived
        self.sos = None

    def speed(self, speedup):
        return (DRIVE_MPS if self.mode == 'drive' else WALK_MPS) * speedup

    def advance(self, metres_left):
        """Move along the path; returns True on arrival."""
        while metres_left > 0 and self.step < len(self.path) - 1:
            nxt = self.path[self.step + 1]
            d = metres(self.pos, nxt)
            if d <= metres_left:
                self.pos, self.step, metres_left = list(nxt), self.step + 1, metres_left - d
            else:
                f = metres_left / d
                self.pos = [self.pos[0] + (nxt[0] - self.pos[0]) * f, self.pos[1] + (nxt[1] - self.pos[1]) * f]
                metres_left = 0
        return self.step >= len(self.path) - 1


def route(url, r):
    import urllib.request
    body = json.dumps({'lat': r.pos[1], 'lng': r.pos[0], 'mode': r.mode}).encode()
    req = urllib.request.Request(url.rstrip('/') + '/api/public/evacuation/route', data=body,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except Exception as e:
        log(f'  route failed for {r.name}: {e}')
        return False
    shelter = data.get('shelter') or {}
    coords = (data.get('route') or {}).get('coordinates') or [r.pos, [shelter.get('lng'), shelter.get('lat')]]
    if None in coords[-1]:
        return False
    r.path, r.step, r.shelter_id = [r.pos] + coords, 0, shelter.get('id')
    return True


def run(args):
    if load_state().get('running'):
        sys.exit(f'A scenario is already recorded in {STATE}. Run --reset first.')
    rng = random.Random(args.seed)
    api = admin_api(args.url)
    code = DAM_CODES[args.dam]
    dam = records(f'SELECT d.id, d.name, s.hazard_status FROM dams d JOIN dam_current_status s ON s.dam_id = d.id WHERE d.code = {quote(code)}')
    if not dam:
        sys.exit(f'Dam {code} not found (run cleanup_demo_data.py first).')
    dam = dam[0]
    zones = records('SELECT z.id, z.zone_name, z.boundary_geojson g FROM dam_hazard_zones z JOIN hazard_levels h ON h.id = z.hazard_level_id '
                    f'WHERE z.dam_id = {dam["id"]} AND z.is_active = 1 AND h.evacuation_required = 1 ORDER BY h.level_number')
    if not zones:
        sys.exit(f'{dam["name"]} has no active evacuation zones.')
    role = records("SELECT id FROM roles WHERE code = 'NORMAL_USER'")[0]['id']
    admin = records(f"SELECT id FROM users WHERE email = {quote(os.environ['DDAS_ADMIN_EMAIL'])}")[0]['id']
    services = records("SELECT id, name, service_type, latitude, longitude FROM emergency_service_providers "
                       "WHERE status = 'active' AND service_type IN ('police', 'hospital', 'fire_brigade')")

    state = {'running': True, 'dam_id': dam['id'], 'previous_status': dam['hazard_status'], 'alert_ids': [], 'blocked_road_ids': []}
    save_state(state)

    log(f'{dam["name"]}: hazard status {dam["hazard_status"]} -> high; {len(zones)} evacuation zones active')
    sql(f"UPDATE dam_current_status SET hazard_status = 'high', last_hazard_assessment_at = NOW() WHERE dam_id = {dam['id']}")
    aid = raise_drill_alert(api, 'EVACUATION_ORDER', 'critical', dam, f'Evacuation Order: {dam["name"]} downstream zones',
                            f'Water released from {dam["name"]}. Leave zones L1–L3 now and go to the nearest shelter.')
    if aid:
        state['alert_ids'].append(aid)
        save_state(state)
        log(f'Evacuation Order raised as a drill (alert {aid}, no SMS)')

    # Residents: weighted towards the inner (most dangerous) zones
    weights = [len(zones) - i for i in range(len(zones))]
    batch = uuid.uuid4().hex[:6]
    people = []
    for i in range(args.people):
        zone = rng.choices(zones, weights)[0]
        lng, lat = random_point(rng, ring_of(zone['g']))
        people.append((f'Resident {batch}-{i + 1:03d}', f'r{batch}{i + 1:03d}@{EMAIL_DOMAIN}', lng, lat,
                       'drive' if rng.random() < 0.3 else 'walk'))
    user_rows = [f"({quote(str(uuid.uuid4()))}, {quote(n)}, {quote(e)}, '!scenario-no-login', {role}, 'active', 0, {lat}, {lng}, NOW())"
                 for n, e, lng, lat, _ in people]
    sql('INSERT INTO users (uuid, full_name, email, password_hash, role_id, status, notification_enabled, '
        'last_known_latitude, last_known_longitude, last_location_update) VALUES ' + ',\n'.join(user_rows))
    ids = {r['email']: r['id'] for r in records(f"SELECT id, email FROM users WHERE email LIKE 'r{batch}%@{EMAIL_DOMAIN}'")}
    sql('INSERT INTO location_sharing_sessions (uuid, user_id, session_type, share_token, expires_at, status, '
        'update_interval_seconds, share_with_authorities, last_latitude, last_longitude, last_update_at) VALUES ' + ',\n'.join(
            f"({quote(str(uuid.uuid4()))}, {ids[e]}, 'manual', {quote('scn-' + uuid.uuid4().hex)}, NOW() + INTERVAL 6 HOUR, "
            f"'active', {TICK}, 1, {lat}, {lng}, NOW())" for _, e, lng, lat, _ in people))
    sessions = {r['user_id']: r['id'] for r in records(
        f"SELECT s.id, s.user_id FROM location_sharing_sessions s JOIN users u ON u.id = s.user_id WHERE u.email LIKE 'r{batch}%'")}
    residents = [Resident(i, ids[e], sessions[ids[e]], n, lng, lat, mode) for i, (n, e, lng, lat, mode) in enumerate(people)]
    log(f'{len(residents)} residents sharing location inside the zones')

    log('Getting evacuation routes ...')
    with ThreadPoolExecutor(8) as pool:
        ok = sum(pool.map(lambda r: route(args.url, r), residents))
    for r in residents:
        if r.path:
            r.state = 'moving'
    log(f'{ok} routes found; residents start moving (x{args.speedup} speed)')

    sos_types = ensure_sos_types()
    duration = args.minutes * 60
    sos_at = sorted(rng.uniform(.1, .6) * duration for _ in range(max(1, args.people // 20)))
    block_at = .35 * duration
    start = time.time()
    arrivals, sos_log = 0, []

    while time.time() - start < duration:
        t = time.time() - start
        updates = []

        if sos_at and t >= sos_at[0]:
            sos_at.pop(0)
            pool_ = [r for r in residents if r.state == 'moving']
            if pool_:
                r = rng.choice(pool_)
                start_sos(r, rng, sos_types, dam, services, admin)
                sos_log.append(r.sos)
                log(f'SOS from {r.name}: {r.sos["label"]}')

        for r in residents:
            if r.state == 'sos':
                progress_sos(r, admin)
            elif r.state == 'moving':
                if r.advance(r.speed(args.speedup) * TICK):
                    r.state = 'arrived'
                    arrivals += 1
                    if r.shelter_id:
                        updates.append(f'UPDATE system_safe_locations SET current_occupancy = current_occupancy + 1 WHERE id = {int(r.shelter_id)}')
                    updates.append(f"UPDATE location_sharing_sessions SET status = 'ended', ended_at = NOW() WHERE id = {r.session_id}")
            if r.state in ('moving', 'sos', 'arrived') and r.state != 'done':
                updates.append(f'UPDATE location_sharing_sessions SET last_latitude = {r.pos[1]:.7f}, last_longitude = {r.pos[0]:.7f}, '
                               f'last_update_at = NOW(), location_update_count = location_update_count + 1 WHERE id = {r.session_id}')
                updates.append(f'INSERT INTO location_sharing_updates (session_id, latitude, longitude, speed_mps, battery_level) VALUES '
                               f'({r.session_id}, {r.pos[1]:.7f}, {r.pos[0]:.7f}, {0 if r.state != "moving" else r.speed(1):.1f}, {rng.randint(20, 95)})')
                if r.state == 'arrived':
                    r.state = 'done'

        if block_at is not None and t >= block_at:
            block_at = None
            block_busiest_road(api, args.url, residents, state)

        if updates:
            sql('START TRANSACTION;\n' + ';\n'.join(updates) + ';\nCOMMIT;')
        moving = sum(r.state == 'moving' for r in residents)
        log(f'{int(t):4d}s  moving {moving:3d} · arrived {arrivals:3d} · SOS open {sum(r.state == "sos" for r in residents)}')
        if moving == 0 and not any(r.state == 'sos' for r in residents) and not sos_at:
            break
        time.sleep(max(0, TICK - (time.time() - start - t)))

    log(f'{dam["name"]}: hazard status back to {state["previous_status"]}')
    sql(f"UPDATE dam_current_status SET hazard_status = {quote(state['previous_status'])} WHERE dam_id = {dam['id']}")
    aid = raise_drill_alert(api, 'ALL_CLEAR', 'info', dam, f'All Clear: {dam["name"]}',
                            'Water levels are back to normal. You can return home safely.')
    if aid:
        state['alert_ids'].append(aid)
    for aid in state['alert_ids'][:1]:
        api.call('PATCH', f'/api/v1/alerts/{aid}/status', {'status': 'resolved'})
    state['running'] = False
    save_state(state)
    times = [s['response_seconds'] for s in sos_log if s.get('response_seconds')]
    log(f'Summary: {arrivals}/{len(residents)} reached shelters, {len(sos_log)} SOS'
        + (f', average response {sum(times) / len(times):.0f} s' if times else '') + f'. Remove with: {Path(__file__).name} --reset')


def raise_drill_alert(api, type_code, severity, dam, title, message):
    """Alert shown on the dashboards as a drill. Created as a draft, marked as a drill, then made
    active, so it can never send SMS (drills are never queued), whatever the SMS switch says."""
    t = records(f'SELECT id FROM alert_types WHERE code = {quote(type_code)}')
    if not t:
        return None
    a = api.call('POST', '/api/v1/alerts', {'alertTypeId': int(t[0]['id']), 'severity': severity, 'status': 'draft',
                                            'damId': int(dam['id']), 'title': title, 'message': message})
    api.call('PATCH', f'/api/v1/alerts/{a["id"]}/simulation?enable=true')
    api.call('PATCH', f'/api/v1/alerts/{a["id"]}/status', {'status': 'active'})
    return a['id']


def ensure_sos_types():
    existing = {r['code']: r['id'] for r in records('SELECT id, code FROM sos_event_types')}
    missing = [k for k in SOS_KINDS if k[0] not in existing]
    if missing:
        sql('INSERT INTO sos_event_types (code, name, default_message, severity_level, auto_share_location) VALUES '
            + ', '.join(f'({quote(c)}, {quote(n)}, {quote(m)}, 4, 1)' for c, n, m in missing))
        existing = {r['code']: r['id'] for r in records('SELECT id, code FROM sos_event_types')}
    return [(existing[c], n, m) for c, n, m in SOS_KINDS if c in existing]


def start_sos(r, rng, sos_types, dam, services, admin):
    type_id, label, message = rng.choice(sos_types)
    sid = str(uuid.uuid4())
    sql('INSERT INTO sos_events (uuid, user_id, sos_type_id, custom_message, status, latitude, longitude, accuracy_meters, dam_id, battery_level) '
        f"VALUES ({quote(sid)}, {r.user_id}, {type_id}, {quote(message)}, 'triggered', {r.pos[1]:.7f}, {r.pos[0]:.7f}, 12, {dam['id']}, 40)")
    sql(f"UPDATE location_sharing_sessions SET session_type = 'sos' WHERE id = {r.session_id}")
    nearest = min(services, key=lambda s: metres(r.pos, [float(s['longitude']), float(s['latitude'])])) if services else None
    r.state = 'sos'
    r.sos = {'uuid': sid, 'label': label, 'started': time.time(), 'stage': 'triggered', 'provider': nearest}


def progress_sos(r, admin):
    s, age = r.sos, time.time() - r.sos['started']
    if s['stage'] == 'triggered' and age > 20:
        s['stage'] = 'acknowledged'
        sql(f"UPDATE sos_events SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = {admin} WHERE uuid = {quote(s['uuid'])}")
    elif s['stage'] == 'acknowledged' and age > 40:
        s['stage'] = 'responding'
        p = s['provider']
        note = f'Simulated responder team near {p["name"]}' if p else 'Simulated responder team'
        meta = {'assignedProviderId': int(p['id']), 'assignedProviderName': p['name']} if p else {}
        sql(f"UPDATE sos_events SET status = 'responding', responding_at = NOW(), response_notes = {quote(note)}, "
            f"response_time_seconds = {int(age)}, metadata = {quote(meta)} WHERE uuid = {quote(s['uuid'])}")
        s['response_seconds'] = int(age)
    elif s['stage'] == 'responding' and age > 80:
        s['stage'] = 'resolved'
        sql(f"UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = {admin}, "
            f"resolution_notes = 'Helped out and on the way to the shelter' WHERE uuid = {quote(s['uuid'])}")
        r.state = 'moving' if r.path else 'arrived'


def block_busiest_road(api, url, residents, state):
    """Block the point that the most residents still have ahead of them, then re-route them."""
    ahead = {}
    for r in residents:
        if r.state == 'moving':
            for p in r.path[r.step + 3: r.step + 40]:
                key = (round(p[0], 3), round(p[1], 3))
                ahead[key] = ahead.get(key, 0) + 1
    if not ahead:
        return
    (lng, lat), count = max(ahead.items(), key=lambda kv: kv[1])
    d = 0.0012
    polygon = {'type': 'Polygon', 'coordinates': [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]]}
    road = api.call('POST', '/api/v1/blocked-roads', {'name': 'Scenario: bridge closed by flood water', 'reason': 'Water over the road',
                                                       'boundaryGeojson': json.dumps(polygon), 'isActive': True})
    state['blocked_road_ids'].append(road.get('id'))
    save_state(state)
    affected = [r for r in residents if r.state == 'moving'
                and any(abs(p[0] - lng) < d and abs(p[1] - lat) < d for p in r.path[r.step:])]
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda r: route(url, r), affected))
    log(f'Road blocked at {lat:.4f}, {lng:.4f} ({count} residents headed there); {len(affected)} re-routed')


def reset(args):
    state = load_state()
    api = admin_api(args.url)
    cols, graph = columns(), foreign_keys()
    admin = records(f"SELECT id FROM users WHERE email = {quote(os.environ['DDAS_ADMIN_EMAIL'])}")[0]['id']
    plan = Plan(cols, graph, admin)
    if state.get('alert_ids'):
        plan.delete('alerts', 'id IN (' + ','.join(str(int(i)) for i in state['alert_ids'] if i) + ')')
    plan.delete('users', f"email LIKE '%@{EMAIL_DOMAIN}'")
    statements = [(f'UPDATE `{t}` SET `{c}`=NULL WHERE {w}' if k == 'clear'
                   else f'UPDATE `{t}` SET `{c}`={int(admin)} WHERE {w}' if k == 'relink'
                   else f'DELETE FROM `{t}` WHERE {w}') for k, t, c, w in plan.steps]
    statements.append('UPDATE system_safe_locations SET current_occupancy = 0')
    if state.get('dam_id'):
        statements.append(f"UPDATE dam_current_status SET hazard_status = {quote(state.get('previous_status') or 'safe')} WHERE dam_id = {int(state['dam_id'])}")
    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    for rid in state.get('blocked_road_ids', []):
        if rid:
            try:
                api.call('DELETE', f'/api/v1/blocked-roads/{int(rid)}')
            except Exception:
                pass
    STATE.unlink(missing_ok=True)
    log('Scenario removed: residents, their locations and SOS, scenario alerts and blocked roads; shelters emptied.')


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--dam', choices=list(DAM_CODES), default='victoria')
    parser.add_argument('--people', type=int, default=80)
    parser.add_argument('--minutes', type=float, default=10)
    parser.add_argument('--speedup', type=float, default=15, help='How much faster than real life people move')
    parser.add_argument('--url', default='http://localhost', help='Web/API address (default: on the server)')
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', default='ddas-db-0', metavar='POD')
    parser.add_argument('--seed', type=int, default=None)
    parser.add_argument('--reset', action='store_true', help='Remove everything a scenario created')
    args = parser.parse_args()
    os.environ['DDAS_DB_POD'] = args.kubectl
    reset(args) if args.reset else run(args)


if __name__ == '__main__':
    main()
