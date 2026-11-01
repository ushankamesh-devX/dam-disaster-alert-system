"""Turn the demo database into a realistic three-dam Mahaweli cascade demo.

    Kotmale (DEMO-001) -> Victoria (DEMO-002, unchanged geography) -> Randenigala (DEMO-003)

Run from the repository root after seed_demo.py, with the Docker Compose MySQL running:

    python api/scripts/seed_cascade_demo.py              # all phases
    python api/scripts/seed_cascade_demo.py --skip-telemetry

Data only: no table, column or migration is created or altered. The other seven demo dams
are marked `decommissioned` (nothing is deleted) and their alerts, reports, SOS events and
news move to the three cascade dams. Dam geography for Kotmale and Randenigala comes from
OpenStreetMap (fixtures/mahaweli-cascade-geography.json, ODbL). Hazard corridors, equipment,
shelters, telemetry, alerts, reports, people and news remain fictional demo data.
Original rows are backed up to api/local-data/<database>/cascade/ before the first change.
"""
import argparse
import csv
import json
import math
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from seed_demo import OUT, records, sql, quote, stamp, demo_where
from scatter_demo import hull, inside, random_point
from cascade_model import Cascade, DAM_ORDER, with_noise

csv.field_size_limit(10_000_000)   # GeoJSON columns exceed the csv default
HERE = Path(__file__).resolve().parent
BACKUP = OUT / 'cascade'
HISTORY_START = datetime(2025, 11, 1)
READING_INTERVAL = 900          # live feeder readings are averaged and saved every 15 minutes
RNG = random.Random(20261101)

CASCADE = {
    'kotmale': dict(code='DEMO-001', name='Kotmale Dam', name_si='කොත්මලේ වේල්ල', name_ta='கொத்மலை அணை',
                    region='Nuwara Eliya District', river='Kotmale Oya', dam_type='embankment',
                    height_meters=87, length_meters=600, year_completed=1985,
                    reservoir_capacity_mcm=None, gross_storage_mcm=None, catchment_area_sqkm=None, spillway_capacity_cumecs=None,
                    location='Kotmale, Central Province. Reference geography: OpenStreetMap (2026-11-01). Telemetry, gates, sensors and hazard records are synthetic demo data.',
                    facts='https://en.wikipedia.org/wiki/Kotmale_Dam'),
    'victoria': dict(code='DEMO-002', name='Victoria Dam'),
    'randenigala': dict(code='DEMO-003', name='Randenigala Dam', name_si='රන්දෙනිගල වේල්ල', name_ta='ரந்தெனிகல அணை',
                        region='Kandy District', river='Mahaweli River', dam_type='embankment',
                        height_meters=94, length_meters=485, year_completed=1986,
                        reservoir_capacity_mcm=861, gross_storage_mcm=861, catchment_area_sqkm=2330, spillway_capacity_cumecs=8100,
                        location='Rantembe, Central Province. Reference geography: OpenStreetMap (2026-11-01). Telemetry, gates, sensors and hazard records are synthetic demo data.',
                        facts='https://en.wikipedia.org/wiki/Randenigala_Dam'),
}
LABEL = {'kotmale': 'Kotmale', 'victoria': 'Victoria', 'randenigala': 'Randenigala'}
# Real district names replace the five generated demo regions (data only).
REGIONS = [('Nuwara Eliya District', 'Central Province', 6.9497, 80.7891), ('Badulla District', 'Uva Province', 6.9934, 81.0550),
           ('Matale District', 'Central Province', 7.4675, 80.6234), ('Polonnaruwa District', 'North Central Province', 7.9403, 81.0188),
           ('Ampara District', 'Eastern Province', 7.2975, 81.6820)]
LOOKUPS = {
    'report_types': ['Structural crack or damage', 'Seepage or leak', 'Flooding or high water', 'Blocked drain or spillway debris', 'Landslide or bank erosion', 'Other safety concern'],
    'alert_types': ['Reservoir level', 'Spill gate operation', 'Heavy rainfall', 'Evacuation'],
    'news_categories': ['Safety advisories', 'Dam operations', 'Weather and monsoon', 'Community and preparedness'],
    'sos_event_types': ['Medical emergency', 'Trapped by floodwater', 'Evacuation assistance', 'Other emergency'],
    'location_types': ['Assembly point', 'Community shelter', 'Medical aid point', 'School or temple shelter'],
}
SENSORS = {   # kind -> (sensor type code, display name, unit, min, max, warning, critical)
    'WATER_LEVEL': ('WATER_LEVEL', 'Reservoir level gauge', 'm', 0, 100, 85, 95),
    'RAINFALL': ('RAINFALL', 'Catchment rain gauge', 'mm/hr', 0, 150, 30, 50),
    'INFLOW': ('INFLOW', 'Reservoir inflow gauge', 'cumecs', 0, 5000, 1200, 2000),
    'OUTFLOW': ('OUTFLOW', 'Release flow gauge', 'cumecs', 0, 5000, 800, 1500),
    'SOIL_MOISTURE': ('SOIL_MOISTURE', 'Downstream bank soil moisture', '%', 0, 100, 70, 85),
    'TEMPERATURE': ('TEMPERATURE', 'Dam weather station', 'C', 0, 45, 35, 40),
    'RIVER_LEVEL_2KM': ('RIVER_LEVEL', 'Downstream river gauge 2 km', 'm', 0, 12, 4, 5.5),
    'RIVER_LEVEL_8KM': ('RIVER_LEVEL', 'Downstream river gauge 8 km', 'm', 0, 12, 3.5, 5),
}
FIRST = ['Nimal', 'Kamala', 'Sunil', 'Chamari', 'Ruwan', 'Dilani', 'Kasun', 'Ishara', 'Tharindu', 'Nadeesha', 'Mohamed', 'Fathima',
         'Saman', 'Anusha', 'Pradeep', 'Sanduni', 'Lahiru', 'Gayani', 'Rajesh', 'Priya', 'Chaminda', 'Malini', 'Ashan', 'Hiruni', 'Kumar']
LAST = ['Perera', 'Fernando', 'Silva', 'Bandara', 'Jayasinghe', 'Wickramasinghe', 'Rathnayake', 'Herath', 'Dissanayake', 'Senanayake',
        'Gunawardena', 'Karunaratne', 'Ekanayake', 'Rajapaksha', 'Weerasinghe', 'Abeysekara', 'Kumarasinghe', 'Nawaz', 'Sivakumar', 'Pathirana']


def km_factors(lat):
    return 111.32 * math.cos(math.radians(lat)), 111.32


def within(point, ring):
    x, y = point
    result = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            result = not result
    return result


def update_sql(table, row_id, values):
    return f'UPDATE `{table}` SET ' + ','.join(f'`{k}`={quote(v)}' for k, v in values.items()) + f' WHERE id={int(row_id)}'


def run(statements, chunk=200):
    for i in range(0, len(statements), chunk):
        sql('START TRANSACTION; ' + ';\n'.join(statements[i:i + chunk]) + '; COMMIT;')


def backup(name, rows):
    BACKUP.mkdir(parents=True, exist_ok=True)
    path = BACKUP / f'before-{name}.json'
    if not path.exists():
        path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding='utf-8')


def load_dams():
    rows = {r['code']: r for r in records("SELECT * FROM dams WHERE code LIKE 'DEMO-%' ORDER BY id")}
    assert rows['DEMO-002']['name'] == 'Victoria Dam', 'Run seed_demo.py first (Victoria must be DEMO-002)'
    return rows


# ── Phase 1: lookups, regions and dam records ──────────────────────────────────

def phase_records():
    statements = []
    for table, names in LOOKUPS.items():
        rows = records(f'SELECT id,name FROM `{table}` ORDER BY id')
        backup(table, rows)
        for row, name in zip(rows, names):
            if row['name'].startswith('Demo '):
                statements.append(update_sql(table, row['id'], {'name': name}))
    if not records("SELECT id FROM sensor_types WHERE code='RIVER_LEVEL'"):
        statements.append("INSERT INTO sensor_types (code,name,description,unit,min_threshold,max_threshold,critical_threshold,icon,created_at) VALUES "
                          "('RIVER_LEVEL','River Level','Downstream river stage gauge','m',0,12,5.5,'waves',UTC_TIMESTAMP())")
    regions = records("SELECT id,name FROM regions WHERE name LIKE 'Demo Region %' ORDER BY id")
    backup('regions', regions)
    for row, (name, province, lat, lon) in zip(regions, REGIONS):
        statements.append(update_sql('regions', row['id'], {'name': name, 'state_province': province, 'country': 'Sri Lanka', 'latitude': lat, 'longitude': lon}))
    run(statements)

    dams = load_dams()
    backup('dams', list(dams.values()))
    geography = json.loads((HERE / 'fixtures/mahaweli-cascade-geography.json').read_text(encoding='utf-8'))
    region_ids = {r['name']: int(r['id']) for r in records('SELECT id,name FROM regions')}
    statements = []
    for key in ['kotmale', 'randenigala']:
        cfg, geo = CASCADE[key], geography['dams'][key]
        g = {f['properties']['kind']: f['geometry'] for f in geo['features']}
        lat, lon = geo['coordinate']['latitude'], geo['coordinate']['longitude']
        statements.append(update_sql('dams', dams[cfg['code']]['id'], dict(
            name=cfg['name'], name_si=cfg['name_si'], name_ta=cfg['name_ta'], location_description=cfg['location'],
            latitude=lat, longitude=lon, map_center_latitude=lat, map_center_longitude=lon, map_default_zoom=12,
            dam_type=cfg['dam_type'], height_meters=cfg['height_meters'], length_meters=cfg['length_meters'],
            reservoir_capacity_mcm=cfg['reservoir_capacity_mcm'], gross_storage_mcm=cfg['gross_storage_mcm'],
            live_storage_mcm=None, dead_storage_mcm=None, catchment_area_sqkm=cfg['catchment_area_sqkm'],
            spillway_capacity_cumecs=cfg['spillway_capacity_cumecs'], year_completed=cfg['year_completed'],
            river_name=cfg['river'], purpose='Hydropower and irrigation',
            operator_organization='Mahaweli Authority of Sri Lanka / Ceylon Electricity Board',
            region_id=region_ids[cfg['region']], status='operational', risk_classification='high',
            dam_boundary_geojson=g['dam'], reservoir_boundary_geojson=g['reservoir'], downstream_river_geojson=g['river'])))
    statements.append(update_sql('dams', dams['DEMO-002']['id'], {'status': 'operational', 'risk_classification': 'high'}))
    for code, row in dams.items():
        if code not in ('DEMO-001', 'DEMO-002', 'DEMO-003'):
            statements.append(update_sql('dams', row['id'], {'status': 'decommissioned'}))
    run(statements)
    print('Records: lookups, regions and dams updated', flush=True)


# ── Phase 2: hazard corridors (same method as update_victoria_zones.py) ────────

def corridor_rings(river, reaches):
    lon0, lat0 = river[0]
    kmx, kmy = km_factors(lat0)
    path, total = [(0., 0., 0.)], 0.
    for a, b in zip(river, river[1:]):
        total += math.hypot((b[0] - a[0]) * kmx, (b[1] - a[1]) * kmy)
        path.append(((b[0] - lon0) * kmx, (b[1] - lat0) * kmy, total))
    rings = []
    for reach, width in reaches:
        centres = [(x, y) for x, y, d in path if d <= reach]
        for a, b in zip(path, path[1:]):
            if a[2] <= reach < b[2]:
                r = (reach - a[2]) / (b[2] - a[2])
                centres.append((a[0] + r * (b[0] - a[0]), a[1] + r * (b[1] - a[1])))
                break
        points = []
        for i, (x, y) in enumerate(centres):
            radius = width * (.72 + .28 * i / max(1, len(centres) - 1))
            points.extend((lon0 + (x + radius * math.cos(t * math.pi / 12)) / kmx,
                           lat0 + (y + radius * math.sin(t * math.pi / 12)) / kmy) for t in range(24))
        ring = hull(points)
        assert not rings or all(inside(p, rings[-1][0]) for p in ring), 'Contours must be nested'
        rings.append((ring, centres))
    return rings, (lon0, lat0, kmx, kmy)


def phase_zones():
    dams = load_dams()
    levels = {int(r['level_number']): int(r['id']) for r in records('SELECT id,level_number FROM hazard_levels')}
    statements = []
    for key in ['kotmale', 'randenigala']:
        dam = dams[CASCADE[key]['code']]
        zones = records(f"SELECT * FROM dam_hazard_zones WHERE dam_id={int(dam['id'])} AND " + demo_where('dam_hazard_zones') + ' ORDER BY id')
        assert len(zones) == 3, f'Expected three demo zones for {key}'
        backup(f'{key}-zones', zones)
        river = json.loads(dam['downstream_river_geojson'])['coordinates']
        spec = [(1, 10., .65, '#eab308', 'Caution'), (2, 5., .40, '#f97316', 'High danger'), (3, 2., .20, '#ef4444', 'Critical danger')]
        rings, (lon0, lat0, kmx, kmy) = corridor_rings(river, [(s[1], s[2]) for s in spec])
        prefix = key.upper()
        for row, (level, reach, _, color, severity), (ring, centres) in zip(zones, spec, rings):
            x, y = centres[len(centres) // 2]
            area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:]))) * kmx * kmy / 2
            statements.append(update_sql('dam_hazard_zones', row['id'], dict(
                hazard_level_id=levels[level], zone_code=f'{prefix}-DEMO-L{level}',
                zone_name=f'Danger Level {level} — {severity}',
                description=f'Demo {severity.lower()} corridor along the {CASCADE[key]["river"]}, approximately {reach:g} km downstream. Illustrative only; not a flood forecast.',
                boundary_geojson={'type': 'Polygon', 'coordinates': [ring]},
                center_latitude=lat0 + y / kmy, center_longitude=lon0 + x / kmx,
                label_position={'lat': lat0 + y / kmy, 'lng': lon0 + x / kmx},
                area_sq_km=round(area, 4), distance_from_dam_km=round(math.hypot(x, y), 2),
                perimeter_km=round(sum(math.hypot((b[0] - a[0]) * kmx, (b[1] - a[1]) * kmy) for a, b in zip(ring, ring[1:])), 4),
                fill_color=color, stroke_color=color, fill_opacity=.22, stroke_width=2, display_order=level,
                show_label=1, is_active=1, is_verified=0, verified_at=None, verified_by=None,
                estimated_flood_arrival_minutes=None, estimated_water_depth_meters=None, flood_velocity_mps=None)))
    run(statements)
    print('Zones: Kotmale and Randenigala corridors created', flush=True)


# ── Phase 3: equipment, river gauges, shelters and incidents ──────────────────

class Site:
    """Geometry helpers for one dam."""

    def __init__(self, dam):
        self.id, self.region = int(dam['id']), int(dam['region_id'])
        self.lat, self.lon = float(dam['latitude']), float(dam['longitude'])
        self.kmx, self.kmy = km_factors(self.lat)
        self.reservoir = json.loads(dam['reservoir_boundary_geojson'])['coordinates']
        self.river = json.loads(dam['downstream_river_geojson'])['coordinates']
        self.crest = json.loads(dam['dam_boundary_geojson'])['coordinates']

    def water(self, p):
        return within(p, self.reservoir[0]) and not any(within(p, r) for r in self.reservoir[1:])

    def distance(self, a, b):
        return math.hypot((a[0] - b[0]) * self.kmx, (a[1] - b[1]) * self.kmy)

    def point_at(self, km):
        travelled = 0.
        for a, b in zip(self.river, self.river[1:]):
            step = self.distance(a, b)
            if travelled + step >= km:
                f = (km - travelled) / step
                return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]
            travelled += step
        return self.river[-1]

    def bank(self, km, offset_km=.12):
        """A point on the river bank (beside the channel) `km` downstream."""
        a, b = self.point_at(km), self.point_at(km + .1)
        dx, dy = (b[0] - a[0]) * self.kmx, (b[1] - a[1]) * self.kmy
        n = math.hypot(dx, dy) or 1
        return [a[0] - dy / n * offset_km / self.kmx, a[1] + dx / n * offset_km / self.kmy]

    def water_points(self):
        pts = []
        for r in [.6, 1., 1.6, 2.4, 3.5, 5.]:
            for t in range(16):
                p = (self.lon + r * math.cos(t * math.pi / 8) / self.kmx, self.lat + r * math.sin(t * math.pi / 8) / self.kmy)
                if self.water(p):
                    pts.append(p)
        assert len(pts) >= 2, 'Reservoir points not found'
        return pts


def coords(p):
    return {'longitude': round(p[0], 8), 'latitude': round(p[1], 8)}


def phase_points():
    dams = load_dams()
    types = {r['code']: int(r['id']) for r in records('SELECT id,code FROM sensor_types')}
    users = [int(r['id']) for r in records("SELECT id FROM users WHERE email LIKE 'demo%@example.invalid' ORDER BY id")]
    inactive_ids = [int(r['id']) for c, r in dams.items() if c not in ('DEMO-001', 'DEMO-002', 'DEMO-003')]
    cascade_ids = [int(dams[CASCADE[k]['code']]['id']) for k in DAM_ORDER]
    statements = []

    # Move hidden dams' activity onto the cascade (round-robin), then hide their shelters.
    for table, column in [('alerts', 'dam_id'), ('reports', 'dam_id'), ('sos_events', 'dam_id'),
                          ('user_hazard_location_snapshots', 'dam_id'), ('news_articles', 'dam_id')]:
        rows = records(f'SELECT id,{column} FROM `{table}` WHERE {column} IN ({",".join(map(str, inactive_ids))}) ORDER BY id')
        backup(f'{table}-dams', rows)
        for i, row in enumerate(rows):
            statements.append(update_sql(table, row['id'], {column: cascade_ids[i % 3]}))
    hidden = records(f'SELECT id FROM system_safe_locations WHERE primary_dam_id IN ({",".join(map(str, inactive_ids))})')
    for row in hidden:
        statements.append(update_sql('system_safe_locations', row['id'], {'status': 'inactive', 'show_on_map': 0}))
    statements.append(f'UPDATE dam_hazard_zones SET is_active=0 WHERE dam_id IN ({",".join(map(str, inactive_ids))})')
    run(statements)

    statements = []
    for key in DAM_ORDER:
        dam = dams[CASCADE[key]['code']]
        site, label = Site(dam), LABEL[key]
        zones = records(f'SELECT * FROM dam_hazard_zones WHERE dam_id={site.id} AND ' + demo_where('dam_hazard_zones') + ' ORDER BY display_order')
        rings = {int(z['id']): json.loads(z['boundary_geojson'])['coordinates'][0] for z in zones}
        zone_levels = {int(z['id']): int(z['hazard_level_id']) for z in zones}

        if key != 'victoria':   # Victoria's equipment and shelters were placed by update_victoria_points.py
            gates = records(f'SELECT * FROM dam_gates WHERE dam_id={site.id} AND ' + demo_where('dam_gates') + ' ORDER BY gate_number')
            backup(f'{key}-gates', gates)
            for i, row in enumerate(gates):
                p = site.crest[round((.35 + .30 * i / max(1, len(gates) - 1)) * (len(site.crest) - 1))]
                statements.append(update_sql('dam_gates', row['id'], {**coords(p), 'gate_type': 'radial', 'max_opening_meters': 12}))
            safe = records(f'SELECT * FROM system_safe_locations WHERE primary_dam_id={site.id} AND ' + demo_where('system_safe_locations') + ' ORDER BY id')
            backup(f'{key}-safe-locations', safe)
            for i, (row, name) in enumerate(zip(safe, ['Ridge Assembly Point', 'Community Shelter', 'Medical Aid Point'])):
                base = site.point_at([1.2, 4.5, 8.5][i])
                for offset in [1.2, 1.5, 1.8, 2.1, 2.6, 3.2]:
                    for bearing in [math.pi / 2, -math.pi / 2, 0, math.pi]:
                        p = (base[0] + offset * math.cos(bearing) / site.kmx, base[1] + offset * math.sin(bearing) / site.kmy)
                        if not site.water(p) and not any(inside(p, r) for r in rings.values()):
                            break
                    else:
                        continue
                    break
                else:
                    raise ValueError(f'No land-based shelter candidate outside zones for {key}')
                statements.append(update_sql('system_safe_locations', row['id'], {
                    **coords(p), 'region_id': site.region, 'code': f'{key.upper()}-DEMO-SAFE-{i + 1:02}',
                    'name': f'{label} Demo — {name}', 'description': 'Fictional demo shelter outside the illustrative danger corridors; not an official or verified evacuation location.',
                    'address_text': f'{label} area — illustrative demo location', 'capacity_persons': [150, 250, 80][i],
                    'current_occupancy': 0, 'status': 'active', 'show_on_map': 1, 'is_verified': 0,
                    'distance_from_dam_km': round(site.distance((site.lon, site.lat), p), 2),
                    'serves_hazard_zones': list(rings), 'marker_icon': ['flag', 'building', 'hospital'][i], 'marker_color': '#16a34a'}))

        # Sensors: rename/reposition the six existing ones and add two downstream river gauges.
        existing = records(f'SELECT s.*,t.code kind FROM sensors s JOIN sensor_types t ON t.id=s.sensor_type_id WHERE s.dam_id={site.id} ORDER BY s.id')
        backup(f'{key}-sensors', existing)
        water = site.water_points()
        soil = site.point_at(3)
        place = {
            'WATER_LEVEL': water[0], 'INFLOW': water[-1], 'OUTFLOW': site.bank(.35),
            'RAINFALL': (site.lon + .0025, site.lat + .0018), 'TEMPERATURE': (site.lon + .0028, site.lat - .0004),
            'SOIL_MOISTURE': (soil[0] + .0028, soil[1] + .0014),
            'RIVER_LEVEL_2KM': site.bank(2), 'RIVER_LEVEL_8KM': site.bank(8),
        }
        by_uid = {r['sensor_uid']: r for r in existing}
        for kind, (type_code, title, unit, lo, hi, warn, crit) in SENSORS.items():
            uid = f'{key.upper()}-{kind.replace("_", "-")}'
            values = {**coords(place[kind]), 'name': f'{label} — {title}', 'sensor_uid': uid,
                      'description': 'Demo equipment location; readings come from the DDAS cascade simulator, not live hardware.',
                      'location_on_dam': title, 'min_reading': lo, 'max_reading': hi, 'warning_threshold': warn,
                      'critical_threshold': crit, 'reading_interval_seconds': READING_INTERVAL, 'status': 'active',
                      'manufacturer': 'DDAS', 'model': 'ESP32 field node (simulated)'}
            row = by_uid.get(uid) or next((r for r in existing if r['kind'] == type_code and r['sensor_uid'] not in
                                           {f'{key.upper()}-{k.replace("_", "-")}' for k in SENSORS}), None)
            if row:
                row['sensor_uid'] = uid
                if key == 'victoria':   # keep Victoria's existing equipment positions
                    values.pop('latitude'); values.pop('longitude')
                statements.append(update_sql('sensors', row['id'], values))
            else:
                values.update(dam_id=site.id, sensor_type_id=types[type_code], installation_date='2025-10-15',
                              battery_level=95, signal_strength=-61, created_at=stamp(datetime.now(timezone.utc).replace(tzinfo=None)))
                statements.append('INSERT INTO sensors (' + ','.join(f'`{k}`' for k in values) + ') VALUES (' + ','.join(quote(v) for v in values.values()) + ')')

        # Reports, SOS events and location snapshots inside this dam's corridors, on land.
        # Rows already placed inside the corridors (e.g. Victoria's) are left where they are.
        safe_points = [(int(r['id']), (float(r['longitude']), float(r['latitude']))) for r in records(
            f"SELECT id,latitude,longitude FROM system_safe_locations WHERE primary_dam_id={site.id} AND status='active'")]
        for table in ['reports', 'sos_events', 'user_hazard_location_snapshots']:
            for row in records(f'SELECT * FROM `{table}` WHERE dam_id={site.id} ORDER BY id'):
                here = (float(row['longitude'] or 0), float(row['latitude'] or 0))
                if any(inside(here, r) for r in rings.values()) and not site.water(here):
                    continue
                zone = zones[int(row['id']) % 3]
                ring = rings[int(zone['id'])]
                for _ in range(1000):
                    p = random_point(RNG, ring, .85)
                    if not site.water(p):
                        break
                values = {**coords(p), 'region_id': site.region}
                if 'hazard_zone_id' in row: values['hazard_zone_id'] = int(zone['id'])
                if 'hazard_level_id' in row: values['hazard_level_id'] = zone_levels[int(zone['id'])]
                if 'address_text' in row: values['address_text'] = f'{label} downstream area — synthetic demo incident'
                if 'location_description' in row: values['location_description'] = f'{CASCADE[key].get("river", "Mahaweli River")} bank, {label} downstream'
                if 'distance_to_dam_km' in row: values['distance_to_dam_km'] = round(site.distance((site.lon, site.lat), p), 2)
                if 'nearest_safe_location_id' in row and safe_points:
                    sid, sp = min(safe_points, key=lambda pair: site.distance(pair[1], p))
                    values['nearest_safe_location_id'] = sid
                    if 'distance_to_safe_location_km' in row: values['distance_to_safe_location_km'] = round(site.distance(sp, p), 2)
                statements.append(update_sql(table, row['id'], values))
        alerts = records(f'SELECT id FROM alerts WHERE dam_id={site.id}')
        for i, row in enumerate(alerts):
            zone = zones[i % 3]
            statements.append(update_sql('alerts', row['id'], {'region_id': site.region, 'hazard_zone_id': int(zone['id']),
                                                               'latitude': round(site.lat, 6), 'longitude': round(site.lon, 6)}))
    run(statements)
    print('Points: gates, sensors (with river gauges), shelters and incidents placed', flush=True)


# ── Phase 4: realistic people, alerts, reports, comments, SOS and news ───────

ALERT_TEXT = {
    'info': ('{dam}: scheduled spill gate test', 'Routine monthly test of spill gate {gate} at {dam} between 10:00 and 11:00. A short siren will sound. No action is needed.', 'No action needed'),
    'warning': ('{dam}: reservoir rising after heavy rain', 'Heavy rain in the {dam} catchment is raising the reservoir. Spill gates may open within 12 hours. Avoid bathing or fishing along the {river}.', 'Stay away from the river banks'),
    'critical': ('{dam}: spill gates opening — river will rise', 'Spill gates at {dam} are opening. The {river} will rise quickly downstream. Move people, vehicles and livestock away from Danger Level 3 areas now.', 'Leave Danger Level 3 areas'),
    'emergency': ('{dam}: evacuate low-lying areas immediately', 'Very high releases from {dam}. Evacuate Danger Level 2 and 3 areas immediately and go to the nearest marked shelter. Do not cross flooded roads or bridges.', 'Evacuate to the nearest shelter'),
}
REPORTS = [
    ('Water seeping near the left abutment', 'Small but steady seepage on the downstream face near the left abutment, clearer than yesterday.'),
    ('Debris blocking the spillway channel', 'Logs and floating debris have collected near the spillway approach after last night\'s rain.'),
    ('River bank eroding near houses', 'The bank behind three houses has eroded about a metre since the gates opened. Families are worried.'),
    ('Crack on the dam access road', 'A crack about 2 m long has appeared on the access road shoulder. Heavy vehicles are still using it.'),
    ('Warning siren not working', 'The downstream warning siren did not sound during today\'s test.'),
    ('Muddy water and fallen trees downstream', 'River water is very muddy and two trees have fallen across the footpath to the paddy fields.'),
]
COMMENTS = ['Thank you, a field officer has been assigned.', 'Same situation near our house as well.', 'Engineers inspected the site this morning; monitoring continues.',
            'Please keep children away from the bank until this is fixed.', 'Issue resolved — debris cleared by the maintenance team.', 'Is it safe to use the footpath now?']
NEWS = [
    ('South-west monsoon brings heavy rain to the upper Mahaweli catchment', 'Weather and monsoon'),
    ('Spill gate inspections completed at Kotmale, Victoria and Randenigala', 'Dam operations'),
    ('Community evacuation drill held in downstream villages', 'Community and preparedness'),
    ('How to read the three danger levels on the DDAS map', 'Safety advisories'),
    ('Reservoir levels rise after inter-monsoon storms', 'Weather and monsoon'),
    ('New downstream river gauges improve flood warnings', 'Dam operations'),
]


def phase_content():
    dams = load_dams()
    by_id = {int(r['id']): k for k in DAM_ORDER for r in [dams[CASCADE[k]['code']]]}
    river = {k: CASCADE[k].get('river', 'Mahaweli River') for k in DAM_ORDER}
    cat = {r['name']: int(r['id']) for r in records('SELECT id,name FROM news_categories')}
    statements = []
    users = records("SELECT id FROM users WHERE email LIKE 'demo%@example.invalid' ORDER BY id")
    for i, row in enumerate(users):
        statements.append(update_sql('users', row['id'], {'full_name': f'{FIRST[i % len(FIRST)]} {LAST[(i * 7) % len(LAST)]}'}))
    for row in records('SELECT id,dam_id,severity FROM alerts ORDER BY id'):
        key = by_id.get(int(row['dam_id'] or 0))
        if not key: continue
        title, message, action = ALERT_TEXT[row['severity']]
        f = dict(dam=LABEL[key] + ' Dam', river=river[key], gate=int(row['id']) % 3 + 1)
        statements.append(update_sql('alerts', row['id'], {
            'title': '[DEMO] ' + title.format(**f), 'message': message.format(**f) + ' (Demo exercise — not a real alert.)',
            'action_required': action, 'source': 'automatic' if row['severity'] in ('warning', 'critical') else 'manual',
            'scope': 'dam_specific', 'simulation_mode': 1}))
    for i, row in enumerate(records('SELECT id,dam_id FROM reports ORDER BY id')):
        key = by_id.get(int(row['dam_id'] or 0))
        if not key: continue
        title, text = REPORTS[i % len(REPORTS)]
        statements.append(update_sql('reports', row['id'], {'title': title, 'description': text + ' (Demo report.)',
                                                            'priority': ['medium', 'high', 'low', 'critical'][i % 4]}))
    for i, row in enumerate(records('SELECT id FROM report_comments ORDER BY id')):
        statements.append(update_sql('report_comments', row['id'], {'comment_text': COMMENTS[i % len(COMMENTS)]}))
    for i, row in enumerate(records('SELECT id,dam_id FROM sos_events ORDER BY id')):
        statements.append(update_sql('sos_events', row['id'], {'custom_message': ['Water entering the house, need help to move my mother.',
            'Road flooded, we are stuck at the bridge with two children.', 'Elderly neighbour cannot walk to the shelter.',
            'Need medical help, injured while moving belongings.'][i % 4] + ' (Demo SOS.)'}))
    for i, row in enumerate(records('SELECT id,dam_id FROM news_articles ORDER BY id')):
        title, category = NEWS[i % len(NEWS)]
        key = by_id.get(int(row['dam_id'] or 0), 'victoria')
        statements.append(update_sql('news_articles', row['id'], {
            'title': title, 'category_id': cat.get(category), 'source': 'DDAS Demo Newsroom',
            'summary': f'{title}. Update for communities downstream of {LABEL[key]} Dam.',
            'content': f'{title}.\n\nThe {LABEL[key]} Dam operations team reminds residents downstream along the {river[key]} to follow DDAS alerts, '
                       'keep an emergency bag ready and know the way to the nearest marked shelter.\n\nThis is a demo article generated for the DDAS demonstration.'}))
    run(statements)
    print('Content: people, alerts, reports, comments, SOS messages and news rewritten', flush=True)


# ── Phase 5: one year of hourly telemetry from the cascade model ──────────────

def phase_telemetry():
    dams = load_dams()
    now = datetime.now(timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0) - timedelta(hours=1)
    sensors, dam_ids = {}, {}
    for key in DAM_ORDER:
        dam_ids[key] = int(dams[CASCADE[key]['code']]['id'])
        for r in records(f"SELECT id,sensor_uid FROM sensors WHERE dam_id={dam_ids[key]} AND sensor_uid LIKE '{key.upper()}-%'"):
            sensors[r['sensor_uid']] = int(r['id'])
    assert len(sensors) == 24, f'Expected 24 cascade sensors, found {len(sensors)}; run the points phase first'
    ids = ','.join(map(str, sensors.values()))
    lo, hi = [int(x) for x in demo_where('sensor_readings').split('BETWEEN ')[1].split(' AND ')]
    existing = {}
    for r in records(f"SELECT id,sensor_id,DATE_FORMAT(recorded_at,'%Y-%m-%d %H:00:00') h FROM sensor_readings WHERE sensor_id IN ({ids}) AND recorded_at>='{stamp(HISTORY_START)}'"):
        existing.setdefault((int(r['sensor_id']), r['h']), []).append(int(r['id']))
    print(f'Generating hourly telemetry {HISTORY_START:%Y-%m-%d} to {now:%Y-%m-%d %H:00} for 24 sensors '
          f'({len(existing):,} sensor-hours already present)...', flush=True)
    inserts, updates, daily, latest = [], [], {}, {}
    for hour, values in Cascade().run_until(now):
        if hour < HISTORY_START:
            continue
        at = stamp(hour)
        for key in DAM_ORDER:
            v = values[key]
            latest[key] = (hour, v)
            for kind in SENSORS:
                sid = sensors[f'{key.upper()}-{kind.replace("_", "-")}']
                value = with_noise(kind, v[kind], sid, at)
                unit = SENSORS[kind][2]
                daily.setdefault((sid, dam_ids[key], hour.date()), []).append(value)
                found = existing.get((sid, at))
                if found:
                    updates.extend((i, value) for i in found if lo <= i <= hi)   # replace the old sine-wave demo values
                else:
                    inserts.append(f"({sid},{dam_ids[key]},{value},{quote(unit)},'{at}','{stamp(hour + timedelta(seconds=4))}','good')")
    for i in range(0, len(inserts), 4000):
        sql('INSERT INTO sensor_readings (sensor_id,dam_id,reading_value,unit,recorded_at,received_at,quality) VALUES '
            + ','.join(inserts[i:i + 4000]) + ';')
        print(f'  inserted {min(i + 4000, len(inserts)):,}/{len(inserts):,}', flush=True)
    for i in range(0, len(updates), 1000):
        chunk = updates[i:i + 1000]
        sql('UPDATE sensor_readings SET reading_value=CASE id ' + ' '.join(f'WHEN {a} THEN {b}' for a, b in chunk)
            + ' END, quality=\'good\' WHERE id IN (' + ','.join(str(a) for a, _ in chunk) + ');')
    aggregates = [f"({sid},{did},'daily','{day} 00:00:00','{day + timedelta(days=1)} 00:00:00',{min(v)},{max(v)},{round(sum(v) / len(v), 4)},{len(v)})"
                  for (sid, did, day), v in daily.items() if len(v) == 24]
    for i in range(0, len(aggregates), 2000):
        sql('INSERT INTO sensor_readings_aggregated (sensor_id,dam_id,aggregation_type,period_start,period_end,min_value,max_value,avg_value,reading_count) VALUES '
            + ','.join(aggregates[i:i + 2000]) + ' ON DUPLICATE KEY UPDATE min_value=VALUES(min_value),max_value=VALUES(max_value),avg_value=VALUES(avg_value),reading_count=VALUES(reading_count);')
    print(f'Telemetry: {len(inserts):,} readings inserted, {len(updates):,} old demo readings replaced, {len(aggregates):,} daily aggregates', flush=True)
    phase_status(latest, dam_ids, sensors)


def phase_status(latest, dam_ids, sensors):
    levels = {int(r['level_number']): int(r['id']) for r in records('SELECT id,level_number FROM hazard_levels')}
    statements = []
    for key in DAM_ORDER:
        hour, v = latest[key]
        did = dam_ids[key]
        level = v['WATER_LEVEL']
        status, n = (('low', 1) if level < 80 else ('moderate', 2) if level < 85 else ('high', 3) if level < 92 else ('severe', 4))
        gates = records(f'SELECT id FROM dam_gates WHERE dam_id={did} ORDER BY gate_number')
        for i, g in enumerate(gates):
            opening = v['_gate_opening'] if i < v['_gates_open'] else 0
            statements.append(update_sql('dam_gates', g['id'], {'current_opening_meters': opening,
                'status': 'closed' if not opening else 'fully_open' if opening >= 11.9 else 'partial', 'last_operation_at': stamp(hour)}))
        rain24 = f"(SELECT COALESCE(SUM(reading_value),0) FROM sensor_readings WHERE sensor_id={sensors[key.upper() + '-RAINFALL']} AND recorded_at>'{stamp(hour - timedelta(hours=24))}')"
        statements.append(f'''UPDATE dam_current_status SET
            water_level_meters=(SELECT CAST(reading_value AS DECIMAL(8,2)) FROM sensor_readings WHERE sensor_id={sensors[key.upper() + '-WATER-LEVEL']} ORDER BY recorded_at DESC, id DESC LIMIT 1),
            water_level_percentage={level}, storage_percentage={level}, full_reservoir_level_meters=100, danger_level_meters=95,
            inflow_cumecs={v['INFLOW']}, outflow_cumecs={v['OUTFLOW']}, rainfall_last_1hr_mm={v['RAINFALL']}, rainfall_last_24hr_mm={rain24},
            total_gates_count={len(gates)}, gates_open_count={min(len(gates), v['_gates_open'])},
            hazard_status='{status}', current_hazard_level_id={levels[n]}, flood_risk_score={round(min(100, max(0, (level - 60) * 2.5)), 1)},
            last_sensor_reading_at='{stamp(hour)}', last_updated='{stamp(hour)}' WHERE dam_id={did}''')
        statements.append(update_sql('dams', did, {'overall_hazard_status': status, 'overall_hazard_level_id': levels[n], 'hazard_last_assessed_at': stamp(hour)}))
        statements.append(f"UPDATE sensors SET last_reading_at='{stamp(hour)}', battery_level=ROUND(70+RAND()*28,1), signal_strength=ROUND(-85+RAND()*30,1) WHERE dam_id={did} AND sensor_uid LIKE '{key.upper()}-%'")
    run(statements)
    print('Status: current dam status, gates and sensor last-reading times updated', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--skip-telemetry', action='store_true', help='Update records only; do not generate the 1-year history')
    parser.add_argument('--only', choices=['records', 'zones', 'points', 'content', 'telemetry'], help='Run a single phase')
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD',
                        help='Use the k3s MySQL pod (default ddas-db-0) instead of Docker Compose')
    args = parser.parse_args()
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl
    phases = {'records': phase_records, 'zones': phase_zones, 'points': phase_points, 'content': phase_content, 'telemetry': phase_telemetry}
    for name, phase in phases.items():
        if args.only and name != args.only:
            continue
        if name == 'telemetry' and args.skip_telemetry:
            continue
        phase()
    print(json.dumps({'cascade': [CASCADE[k]['name'] for k in DAM_ORDER], 'hiddenDams': 'decommissioned (not deleted)', 'schemaChanged': False}))


if __name__ == '__main__':
    main()
