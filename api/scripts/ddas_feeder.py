"""DDAS feeder: always-on simulated ESP32 nodes for the Kotmale/Victoria/Randenigala demo.

    python3 ddas_feeder.py --api http://api:8080            # runs until stopped
    python3 ddas_feeder.py --dry-run --once                  # check values without the API

Sends one reading per sensor every minute through the device API (X-Device-API-Key).
Values come from cascade_model.py and continue the seeded history: seasons, 3-7 day
weather spells, afternoon showers, 6-hour generation shifts, the evening peak and the
cascade between dams. No flood scenarios: ddas_demo.py does that for two minutes and
pauses this feed for the demo dams while it runs.

Device keys are created or rotated at start-up with DDAS_ADMIN_EMAIL / DDAS_ADMIN_PASSWORD
and shared with ddas_demo.py through DDAS_KEYS_FILE (private to the container).
Standard library only. All values are synthetic demo data.
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cascade_model import Cascade, DAM_ORDER, SENSOR_KINDS, with_noise  # noqa: E402

KEY_NAME = 'DDAS IoT simulator'
UNITS = {'WATER_LEVEL': 'm', 'RAINFALL': 'mm/hr', 'INFLOW': 'cumecs', 'OUTFLOW': 'cumecs', 'SOIL_MOISTURE': '%',
         'TEMPERATURE': 'C', 'RIVER_LEVEL_2KM': 'm', 'RIVER_LEVEL_8KM': 'm'}
RUN_DIR = Path(os.environ.get('DDAS_SIM_DIR', '/tmp/ddas-sim'))
KEYS_FILE = RUN_DIR / 'keys.json'
PAUSE_FILE = RUN_DIR / 'pause.json'


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def log(message):
    print(f'{utcnow():%Y-%m-%d %H:%M:%S}Z {message}', flush=True)


def uid(dam, kind):
    return f'{dam.upper()}-{kind.replace("_", "-")}'


class Api:
    def __init__(self, base):
        self.base, self.token = base.rstrip('/'), None

    def call(self, method, path, body=None, headers=None):
        request = urllib.request.Request(self.base + path, method=method,
                                         data=json.dumps(body).encode() if body is not None else None,
                                         headers={'Content-Type': 'application/json', 'Accept': 'application/json', **(headers or {})})
        if self.token and 'X-Device-API-Key' not in (headers or {}):
            request.add_header('Authorization', 'Bearer ' + self.token)
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read() or b'null')
        # Most endpoints wrap results in {"success":..,"data":..}; some return the object directly.
        return payload.get('data', payload) if isinstance(payload, dict) and 'data' in payload else payload

    def login(self):
        email, password = os.environ.get('DDAS_ADMIN_EMAIL'), os.environ.get('DDAS_ADMIN_PASSWORD')
        if not email or not password:
            sys.exit('Set DDAS_ADMIN_EMAIL and DDAS_ADMIN_PASSWORD (an account with dams.manage_sensors).')
        self.token = self.call('POST', '/api/v1/auth/login', {'email': email, 'password': password})['token']

    def device_key(self, sensor_id):
        """Rotate this simulator's key for the sensor (or create one) and return the raw key."""
        keys = [k for k in self.call('GET', f'/api/v1/device-keys/sensor/{sensor_id}') if k.get('name') == KEY_NAME]
        if keys:
            if not keys[0].get('isActive'):
                self.call('PUT', f'/api/v1/device-keys/{keys[0]["id"]}/activate')
            return self.call('POST', f'/api/v1/device-keys/{keys[0]["id"]}/regenerate')['apiKey']
        return self.call('POST', '/api/v1/device-keys', {'sensorId': sensor_id, 'name': KEY_NAME,
                                                          'description': 'Synthetic ESP32 feed from api/scripts/ddas_feeder.py'})['apiKey']

    def send(self, key, body):
        self.call('POST', '/api/v1/device/readings', body, {'X-Device-API-Key': key})


def reading(kind, value, sensor_id, now, battery):
    return {'readingValue': with_noise(kind, round(value, 3), sensor_id, now.isoformat()), 'unit': UNITS[kind],
            'quality': 'good', 'recordedAt': now.replace(microsecond=0).isoformat(), 'batteryLevel': round(battery, 1),
            'signalStrength': round(random.uniform(-82, -55), 1), 'status': 'active'}


def paused_dams():
    """Dams that ddas_demo.py is driving right now (the pause expires on its own)."""
    try:
        data = json.loads(PAUSE_FILE.read_text(encoding='utf-8'))
        return set(data['dams']) if datetime.fromisoformat(data['until']) > utcnow() else set()
    except (OSError, ValueError, KeyError):
        return set()


def provision(api, dams):
    for attempt in range(60):
        try:
            api.login()
            break
        except (urllib.error.URLError, OSError) as error:
            log(f'API not reachable yet ({error}); retrying in 10 s')
            time.sleep(10)
    else:
        sys.exit('API not reachable')
    nodes = []
    for dam in dams:
        for kind in SENSOR_KINDS:
            sensor = api.call('GET', f'/api/v1/sensors/uid/{uid(dam, kind)}')
            nodes.append(dict(dam=dam, kind=kind, id=sensor['id'], key=api.device_key(sensor['id']), battery=random.uniform(78, 98)))
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    KEYS_FILE.write_text(json.dumps({uid(n['dam'], n['kind']): {'id': n['id'], 'key': n['key']} for n in nodes}), encoding='utf-8')
    os.chmod(KEYS_FILE, 0o600)
    return nodes


def main():
    parser = argparse.ArgumentParser(description='Always-on DDAS sensor feed')
    parser.add_argument('--api', default=os.environ.get('DDAS_API_URL', 'http://localhost:8080'))
    parser.add_argument('--interval', type=int, default=int(os.environ.get('DDAS_SIM_INTERVAL', 60)), help='seconds between readings')
    parser.add_argument('--dams', type=lambda s: s.split(','), default=DAM_ORDER)
    parser.add_argument('--dry-run', action='store_true', help='Compute and log values without calling the API')
    parser.add_argument('--once', action='store_true', help='Send one round of readings and exit')
    args = parser.parse_args()

    api = Api(args.api)
    if args.dry_run:
        nodes = [dict(dam=d, kind=k, id=0, key=None, battery=90.) for d in args.dams for k in SENSOR_KINDS]
    else:
        nodes = provision(api, args.dams)
        log(f'Provisioned {len(nodes)} simulated ESP32 nodes; sending every {args.interval}s')

    sim = Cascade()
    for _, previous in sim.run_until(utcnow().replace(minute=0, second=0, microsecond=0)):
        pass
    upcoming = sim.step()                         # model values at the next hour boundary
    sent = failed = 0
    while True:
        now = utcnow()
        while now >= sim.hour:                    # roll the hourly window forward
            previous, upcoming = upcoming, sim.step()
        frac = min(1., max(0., (now - (sim.hour - timedelta(hours=1))).total_seconds() / 3600))
        paused = paused_dams()
        summary, rejected = [], False
        for dam in args.dams:
            values = {k: previous[dam][k] + (upcoming[dam][k] - previous[dam][k]) * frac for k in SENSOR_KINDS}
            summary.append(f'{dam} {values["WATER_LEVEL"]:.2f}' + (' (demo)' if dam in paused else ''))
            if dam in paused:
                continue
            for node in (n for n in nodes if n['dam'] == dam):
                daylight = 6 <= (now.hour + 5.5) % 24 < 18          # Sri Lanka time: solar charging
                node['battery'] = min(100., node['battery'] + (.05 if daylight else -.03))
                try:
                    if not args.dry_run:
                        api.send(node['key'], reading(node['kind'], values[node['kind']], node['id'], now, node['battery']))
                    sent += 1
                except urllib.error.HTTPError as error:
                    failed += 1
                    rejected |= error.code in (401, 403)            # key rotated or revoked elsewhere
                except (urllib.error.URLError, OSError):
                    failed += 1
        log(f'level {" | ".join(summary)} | sent {sent} failed {failed}')
        if rejected:
            try:
                nodes = provision(api, args.dams)
            except (urllib.error.URLError, OSError, KeyError) as error:
                log(f'Re-provisioning failed: {error}')
        if args.once:
            return
        time.sleep(args.interval)


if __name__ == '__main__':
    main()
