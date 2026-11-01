"""Deterministic synthetic hydrology for the Kotmale -> Victoria -> Randenigala demo cascade.

Shared by seed_cascade_demo.py (hourly history) and iot_simulator.py (live feed), so live
readings continue the seeded history. Standard library only.

Everything here is illustrative: rainfall climatology, catchment response, rule curves and
turbine/spill capacities are plausible model parameters, not measured or official values.
Water level uses the app's existing 0-100 scale (full reservoir level 100, danger 95).
"""
import math
import random
from datetime import datetime, timedelta

EPOCH = datetime(2025, 10, 1)          # simulation spin-up start (UTC, naive)
DAM_ORDER = ['kotmale', 'victoria', 'randenigala']

# Monthly rainfall climatology (mm/month, Jan..Dec). Kotmale sits in the wet zone (south-west
# monsoon); Randenigala is drier in mid-year and wetter under the north-east monsoon.
DAMS = {
    'kotmale': dict(rain=[150, 90, 120, 200, 220, 330, 300, 260, 230, 300, 280, 220],
                    catchment=540., storage=174., turbine=105., spill_per_gate=900., base_temp=21.,
                    upstream=None, lag=0, level0=72.),
    'victoria': dict(rain=[200, 90, 110, 190, 120, 90, 80, 90, 120, 280, 300, 260],
                     catchment=1350., storage=722., turbine=165., spill_per_gate=2700., base_temp=25.5,
                     upstream='kotmale', lag=7, level0=66.),
    'randenigala': dict(rain=[230, 110, 120, 180, 80, 40, 50, 60, 90, 260, 310, 300],
                        catchment=440., storage=861., turbine=200., spill_per_gate=2700., base_temp=27.,
                        upstream='victoria', lag=3, level0=61.),
}

SENSOR_KINDS = ['WATER_LEVEL', 'RAINFALL', 'INFLOW', 'OUTFLOW', 'SOIL_MOISTURE', 'TEMPERATURE',
                'RIVER_LEVEL_2KM', 'RIVER_LEVEL_8KM']
NOISE = {'WATER_LEVEL': .02, 'RAINFALL': 0., 'INFLOW': .03, 'OUTFLOW': .01, 'SOIL_MOISTURE': .4,
         'TEMPERATURE': .25, 'RIVER_LEVEL_2KM': .01, 'RIVER_LEVEL_8KM': .01}


def _rng(*key):
    return random.Random('|'.join(str(k) for k in key))


def _storm(dam, day):
    """Hourly rainfall (mm/h) for one dam and one day; regional weather is shared."""
    cfg = DAMS[dam]
    month = day.month - 1
    regional = _rng('region', day.isoformat())
    wetness = regional.random()                      # shared day-to-day weather regime
    local = _rng(dam, day.isoformat())
    monthly = cfg['rain'][month]
    p_wet = min(.85, max(.15, .15 + monthly / 420))
    hours = [0.] * 24
    if wetness * .6 + local.random() * .4 > p_wet:
        return hours
    total = local.expovariate(1 / (monthly / 30 / p_wet))
    # Rare heavy events, mostly in the monsoon/inter-monsoon peaks: these give the model
    # flood and overflow examples to learn from.
    if regional.random() < (.025 if month in (5, 9, 10, 11) else .006):
        total *= 3 + 3 * regional.random()
    monsoon = month in (4, 5, 6, 7, 8) if dam == 'kotmale' else month in (10, 11, 0)
    start = local.randint(0, 23) if monsoon else min(23, max(11, int(local.gauss(15, 2))))
    duration = local.randint(2, 9)
    weights = [math.sin(math.pi * (i + .5) / duration) + .2 for i in range(duration)]
    for i, w in enumerate(weights):
        hours[(start + i) % 24] += total * w / sum(weights)
    return [round(h, 2) for h in hours]


class Cascade:
    """Hour-by-hour simulation of the three reservoirs from EPOCH onwards."""

    def __init__(self):
        self.t = EPOCH
        self.state = {d: dict(soil=.5, quick=0., base=DAMS[d]['catchment'] * 9000.,
                              storage=DAMS[d]['storage'] * DAMS[d]['level0'] / 100,
                              outflow=[DAMS[d]['turbine'] * .5] * 12, river=[30.] * 4)
                      for d in DAM_ORDER}
        self._rain_day, self._rain = None, {}
        self.hour = None

    def rain(self, dam, t):
        day = t.date()
        if self._rain_day != day:
            self._rain_day, self._rain = day, {d: _storm(d, day) for d in DAM_ORDER}
        return self._rain[dam][t.hour]

    def step(self):
        """Advance one hour; returns {dam: {kind: value}} for the hour that just ended."""
        t, out = self.t, {}
        for dam in DAM_ORDER:
            cfg, s = DAMS[dam], self.state[dam]
            rain = self.rain(dam, t)
            # Catchment: soil wetness drives runoff; quick and slow linear stores.
            s['soil'] = min(1., s['soil'] * .996 + rain / 90)
            effective = (.12 + .55 * s['soil']) * rain / 1000 * cfg['catchment'] * 1e6
            s['quick'] += effective * .8
            s['base'] += effective * .2
            q_quick, q_base = s['quick'] / 7, s['base'] / 420
            s['quick'] -= q_quick
            s['base'] -= q_base
            upstream = 0.
            if cfg['upstream']:
                upstream = self.state[cfg['upstream']]['outflow'][-1 - cfg['lag']]
            inflow = (q_quick + q_base) / 3600 + upstream
            # Operation: seasonal rule curve, evening peak generation, spill above 92.
            level = 100 * s['storage'] / cfg['storage']
            rule = 72 + 12 * math.cos(2 * math.pi * (t.timetuple().tm_yday - 330) / 365)
            share = min(1., max(.15, .45 + (level - rule) / 25))
            # Generation follows 6-hour shifts: low overnight, steady by day, evening peak.
            peak = [.7, 1., .9, 1.3][t.hour // 6]
            turbine = cfg['turbine'] * min(1., share * peak)
            spill = 0.
            if level > 92:
                spill = min(3 * cfg['spill_per_gate'], 140 * (level - 92) ** 1.4 + .5 * max(0., inflow - turbine))
            outflow = turbine + spill
            s['storage'] = max(cfg['storage'] * .2, s['storage'] + (inflow - outflow) * 3600 / 1e6)
            s['outflow'] = (s['outflow'] + [outflow])[-12:]
            level = 100 * s['storage'] / cfg['storage']
            s['river'] = (s['river'] + [outflow])[-4:]
            seasonal = 1.2 * math.cos(2 * math.pi * (t.timetuple().tm_yday - 110) / 365)
            temp = cfg['base_temp'] + seasonal + 3.8 * math.sin(2 * math.pi * (t.hour - 9) / 24) - (1.5 if rain > 1 else 0)
            gates = min(3, math.ceil(spill / cfg['spill_per_gate'] - 1e-9)) if spill > 0 else 0
            out[dam] = {
                'WATER_LEVEL': round(level, 3),
                'RAINFALL': rain,
                'INFLOW': round(inflow, 2),
                'OUTFLOW': round(outflow, 2),
                'SOIL_MOISTURE': round(22 + 50 * s['soil'], 2),
                'TEMPERATURE': round(temp, 2),
                'RIVER_LEVEL_2KM': round(.35 + .105 * s['river'][-1] ** .55, 3),
                'RIVER_LEVEL_8KM': round(.30 + .095 * (.6 * s['river'][-3] + .4 * s['river'][-4]) ** .55, 3),
                '_spill': round(spill, 2), '_gates_open': gates,
                '_gate_opening': round(min(1., spill / (max(gates, 1) * cfg['spill_per_gate'])) * 12, 2) if gates else 0.,
            }
        self.hour, self.t = t, t + timedelta(hours=1)
        return out

    def run_until(self, end):
        """Yield (hour, values) for every hour from the current position up to `end`."""
        while self.t <= end:
            values = self.step()
            yield self.hour, values


def with_noise(kind, value, *key):
    """Small deterministic measurement noise, as a real gauge would report."""
    if kind == 'RAINFALL' or kind.startswith('_'):
        return value
    noisy = value + _rng('noise', kind, *key).gauss(0, NOISE[kind])
    return round(max(0., noisy), 3)


if __name__ == '__main__':
    # Quick sanity report: yearly range per dam and sensor.
    sim, stats = Cascade(), {}
    for hour, values in sim.run_until(datetime(2026, 11, 1)):
        for dam, v in values.items():
            for k, x in v.items():
                lo, hi, n, total = stats.get((dam, k), (x, x, 0, 0.))
                stats[(dam, k)] = (min(lo, x), max(hi, x), n + 1, total + x)
    for (dam, k), (lo, hi, n, total) in sorted(stats.items()):
        print(f'{dam:12} {k:16} min {lo:9.2f}  mean {total / n:9.2f}  max {hi:9.2f}')
