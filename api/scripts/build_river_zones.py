"""Replace each dam's danger zones with 5 levels that follow its downstream river and widen with distance.

    python3 build_river_zones.py --kubectl              # dry run: zones it would create
    python3 build_river_zones.py --kubectl --apply      # back up the old zones, then replace them

Data only (no schema change). Uses the downstream river line already stored on each dam (OpenStreetMap),
so the reference geography (dam, reservoir and river outlines) is untouched. Bands stop where the stored
river line ends. Widths and flood arrival times are illustrative demo values, not official flood maps.
"""
import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import docker, quote, records, sql  # noqa: E402
from cleanup_demo_data import Plan, columns, foreign_keys  # noqa: E402

# level, from km, to km, half-width at start (m), at end (m), flood arrival (min), fill, stroke, opacity, name
LEVELS = [
    (1, 0, 3, 500, 700, 10, '#B91C1C', '#7F1D1D', 0.45, 'Extreme danger'),
    (2, 3, 8, 700, 950, 35, '#EA580C', '#9A3412', 0.38, 'High danger'),
    (3, 8, 15, 950, 1250, 75, '#F59E0B', '#B45309', 0.32, 'Moderate danger'),
    (4, 15, 25, 1250, 1600, 135, '#EAB308', '#A16207', 0.22, 'Low danger'),
    (5, 25, 35, 1600, 2000, 210, '#94A3B8', '#475569', 0.18, 'Watch'),
]
CODES = {'KOT-01': 'KOT', 'VIC-01': 'VIC', 'RAN-01': 'RAN', 'DEMO-001': 'KOT', 'DEMO-002': 'VIC', 'DEMO-003': 'RAN'}


def to_xy(lng, lat, lat0):
    return lng * 111320 * math.cos(math.radians(lat0)), lat * 110540


def to_lnglat(x, y, lat0):
    return [round(x / (111320 * math.cos(math.radians(lat0))), 7), round(y / 110540, 7)]


def river_line(geojson):
    g = json.loads(geojson) if isinstance(geojson, str) else geojson
    g = g.get('geometry', g)
    if g['type'] == 'LineString':
        return g['coordinates']
    if g['type'] == 'MultiLineString':
        return [p for part in g['coordinates'] for p in part]
    raise ValueError(f'Unsupported river geometry {g["type"]}')


def slice_line(xy, start_m, end_m):
    """Points of the polyline between two distances along it as (x, y, distance), plus its total length."""
    cum = [0.0]
    for i in range(1, len(xy)):
        cum.append(cum[-1] + math.dist(xy[i - 1], xy[i]))
    total = cum[-1]

    def at(d):
        d = max(0.0, min(d, total))
        for i in range(1, len(xy)):
            if cum[i] >= d:
                seg = cum[i] - cum[i - 1] or 1
                f = (d - cum[i - 1]) / seg
                return (xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * f, xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * f, d)
        return (*xy[-1], total)

    inner = [(x, y, c) for (x, y), c in zip(xy, cum) if start_m < c < end_m]
    return [at(start_m)] + inner + [at(end_m)], total


def band(points, w_start, w_end, start_m, end_m):
    """Buffer a polyline into a polygon whose half-width grows from w_start to w_end."""
    left, right = [], []
    for i, (x, y, d) in enumerate(points):
        a = points[max(0, i - 1)]
        b = points[min(len(points) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        w = w_start + (w_end - w_start) * ((d - start_m) / max(1, end_m - start_m))
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return left + right[::-1] + [left[0]]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl

    dams = records("SELECT id, code, name, latitude, longitude, downstream_river_geojson g FROM dams "
                   "WHERE status <> 'decommissioned' AND downstream_river_geojson IS NOT NULL")
    levels = {int(r['level_number']): r['id'] for r in records('SELECT id, level_number FROM hazard_levels')}
    missing = [lv[0] for lv in LEVELS if lv[0] not in levels]
    if missing:
        sys.exit(f'hazard_levels is missing level(s) {missing}')

    zones = []
    for dam in dams:
        line = river_line(dam['g'])
        lat0 = float(dam['latitude'])
        dam_xy = to_xy(float(dam['longitude']), lat0, lat0)
        xy = [to_xy(lng, lat, lat0) for lng, lat in line]
        # The river must start at the dam: reverse it if its far end is the closer one
        if math.dist(xy[-1], dam_xy) < math.dist(xy[0], dam_xy):
            xy = xy[::-1]
        _, total = slice_line(xy, 0, 0)
        prefix = CODES.get(dam['code'], dam['code'][:3].upper())
        print(f'{dam["name"]}: river line {total / 1000:.1f} km', flush=True)
        for level, km0, km1, w0, w1, eta, fill, stroke, opacity, name in LEVELS:
            start, end = km0 * 1000, min(km1 * 1000, total)
            if end - start < 300:
                print(f'  L{level}: skipped (river line ends at {total / 1000:.1f} km)')
                continue
            pts, _ = slice_line(xy, start, end)
            if len(pts) < 2:
                continue
            ring = [to_lnglat(x, y, lat0) for x, y in band(pts, w0, w1, start, end)]
            mid = pts[len(pts) // 2]
            centre = to_lnglat(mid[0], mid[1], lat0)
            zones.append(dict(dam_id=int(dam['id']), level=level, code=f'{prefix}-RIVER-L{level}',
                              name=f'{dam["name"].replace(" Dam", "")} L{level} · {name} ({km0}–{round(end / 1000, 1):g} km)',
                              geojson={'type': 'Polygon', 'coordinates': [ring]}, lat=centre[1], lng=centre[0],
                              km=round((start + end) / 2000, 2), eta=eta, fill=fill, stroke=stroke, opacity=opacity))
            print(f'  L{level}: {km0}–{end / 1000:.1f} km, {w0 * 2 / 1000:.1f}–{w1 * 2 / 1000:.1f} km wide, water in ~{eta} min')

    if not args.apply:
        print(f'\nDry run: {len(zones)} zones for {len(dams)} dams. Re-run with --apply to replace the current zones.')
        return

    backup = Path.home() / f'ddas-zones-backup-{datetime.now():%Y%m%d-%H%M}.sql'
    dump = docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --no-tablespaces --skip-triggers '
                  '--set-gtid-purged=OFF $MYSQL_DATABASE dam_hazard_zones')
    backup.write_bytes(dump)
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
                                    'Illustrative demo zone along the downstream river (not an official flood map).',
                                    z['geojson'], z['lat'], z['lng'], z['km'], z['eta'], z['fill'], z['opacity'],
                                    z['stroke'], 2, z['level'], 1, 1, 0])) + ')')
    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    print(f'Done: {len(zones)} zones created. Undo: restore {backup}')


if __name__ == '__main__':
    main()
