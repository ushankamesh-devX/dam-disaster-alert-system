"""Two-minute storm for live demos, run next to the always-on feeder.

    python3 ddas_demo.py flood --dam victoria          # 2 minutes (default)
    python3 ddas_demo.py heavy-rain --dam kotmale --seconds 90

What it does:
1. Pauses ddas_feeder.py for the chosen dam and the next dam downstream (pause expires on its own).
2. Sets those sensors to save every 10 s instead of every 15 min, so charts move live.
3. Plays the storm: rain, inflow surge, level up, gates release, river gauges rise; the
   downstream dam's inflow rises as the release arrives.
4. Restores the 15-minute interval and hands back to the feeder (also on Ctrl+C).

Uses the device keys written by the feeder (same container), and DDAS_ADMIN_EMAIL /
DDAS_ADMIN_PASSWORD to change the save interval. All values are synthetic demo data.
"""
import argparse
import json
import math
import os
import time
import urllib.error
from datetime import datetime, timedelta

from cascade_model import Cascade, DAM_ORDER, SENSOR_KINDS
from ddas_feeder import Api, KEYS_FILE, PAUSE_FILE, RUN_DIR, log, reading, uid, utcnow

NORMAL_INTERVAL, DEMO_INTERVAL, STEP = 900, 10, 3


def curve(*points):
    return points


# Each curve: (fraction of the demo, target as a function of the normal value).
STORMS = {
    'flood': {
        'RAINFALL': curve((0, lambda b: b), (.15, lambda b: 45), (.5, lambda b: 40), (.75, lambda b: 4), (1, lambda b: b)),
        'INFLOW': curve((0, lambda b: b), (.45, lambda b: b + 2200), (.8, lambda b: b + 1000), (1, lambda b: b)),
        'WATER_LEVEL': curve((0, lambda b: b), (.55, lambda b: max(b, 97.2)), (.8, lambda b: max(b, 95.5)), (1, lambda b: b)),
        'OUTFLOW': curve((0, lambda b: b), (.3, lambda b: b), (.6, lambda b: b + 1800), (.85, lambda b: b + 900), (1, lambda b: b)),
        'RIVER_LEVEL_2KM': curve((0, lambda b: b), (.35, lambda b: b), (.65, lambda b: 6.6), (.9, lambda b: 4.2), (1, lambda b: b)),
        'RIVER_LEVEL_8KM': curve((0, lambda b: b), (.45, lambda b: b), (.75, lambda b: 5.9), (.95, lambda b: 3.8), (1, lambda b: b)),
        'SOIL_MOISTURE': curve((0, lambda b: b), (.5, lambda b: 88), (1, lambda b: b)),
    },
    'heavy-rain': {
        'RAINFALL': curve((0, lambda b: b), (.2, lambda b: 22), (.7, lambda b: 18), (1, lambda b: b)),
        'INFLOW': curve((0, lambda b: b), (.6, lambda b: b + 900), (1, lambda b: b)),
        'WATER_LEVEL': curve((0, lambda b: b), (.7, lambda b: min(91, b + 5)), (1, lambda b: b)),
        'RIVER_LEVEL_2KM': curve((0, lambda b: b), (.7, lambda b: b + 1.5), (1, lambda b: b)),
        'RIVER_LEVEL_8KM': curve((0, lambda b: b), (.8, lambda b: b + 1.2), (1, lambda b: b)),
        'SOIL_MOISTURE': curve((0, lambda b: b), (.6, lambda b: 80), (1, lambda b: b)),
    },
}
# The release reaches the next dam downstream: its inflow rises later and less.
DOWNSTREAM = {
    'INFLOW': curve((0, lambda b: b), (.45, lambda b: b), (.8, lambda b: b + 1300), (1, lambda b: b)),
    'WATER_LEVEL': curve((0, lambda b: b), (.5, lambda b: b), (.9, lambda b: min(92, b + 3)), (1, lambda b: b)),
}


def at(points, p, base):
    for (p0, f0), (p1, f1) in zip(points, points[1:]):
        if p0 <= p <= p1:
            w = (p - p0) / (p1 - p0) if p1 > p0 else 1
            a, b = f0(base), f1(base)
            return a + (b - a) * (.5 - .5 * math.cos(math.pi * w))   # ease in/out
    return base


def main():
    parser = argparse.ArgumentParser(description='Two-minute demo storm')
    parser.add_argument('storm', choices=sorted(STORMS))
    parser.add_argument('--dam', choices=DAM_ORDER, default='victoria')
    parser.add_argument('--seconds', type=int, default=120)
    parser.add_argument('--api', default=os.environ.get('DDAS_API_URL', 'http://localhost:8080'))
    args = parser.parse_args()

    keys = json.loads(KEYS_FILE.read_text(encoding='utf-8'))      # written by the running feeder
    i = DAM_ORDER.index(args.dam)
    plan = {args.dam: STORMS[args.storm]}
    if args.storm == 'flood' and i + 1 < len(DAM_ORDER):
        plan[DAM_ORDER[i + 1]] = DOWNSTREAM
    sensors = {(d, k): keys[uid(d, k)] for d in plan for k in SENSOR_KINDS}

    api = Api(args.api)
    api.login()
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    PAUSE_FILE.write_text(json.dumps({'dams': list(plan), 'until': (utcnow() + timedelta(seconds=args.seconds + 60)).isoformat()}))
    for s in sensors.values():
        api.call('PUT', f'/api/v1/sensors/{s["id"]}', {'readingIntervalSeconds': DEMO_INTERVAL})

    sim = Cascade()
    for _, base in sim.run_until(utcnow().replace(minute=0, second=0, microsecond=0)):
        pass
    log(f'{args.storm} at {args.dam} for {args.seconds}s (feeder paused for {", ".join(plan)})')
    start = time.monotonic()
    try:
        while (elapsed := time.monotonic() - start) <= args.seconds:
            p, now = elapsed / args.seconds, utcnow()
            line = []
            for dam, curves in plan.items():
                values = {k: at(curves[k], p, base[dam][k]) if k in curves else base[dam][k] for k in SENSOR_KINDS}
                line.append(f'{dam} level {values["WATER_LEVEL"]:.1f} inflow {values["INFLOW"]:.0f} river {values["RIVER_LEVEL_2KM"]:.1f}m')
                for kind in SENSOR_KINDS:
                    s = sensors[(dam, kind)]
                    try:
                        api.send(s['key'], reading(kind, values[kind], s['id'], now, 90.))
                    except (urllib.error.URLError, OSError) as error:
                        log(f'send failed for {uid(dam, kind)}: {error}')
            log(f'{p:4.0%}  ' + ' | '.join(line))
            time.sleep(STEP)
    finally:
        for s in sensors.values():
            api.call('PUT', f'/api/v1/sensors/{s["id"]}', {'readingIntervalSeconds': NORMAL_INTERVAL})
        PAUSE_FILE.unlink(missing_ok=True)
        log('Demo finished: 15-minute interval restored, feeder resumed')


if __name__ == '__main__':
    main()
