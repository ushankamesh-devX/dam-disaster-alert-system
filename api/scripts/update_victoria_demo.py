"""Replace only DEMO-002 geography with sourced Victoria Dam reference data.

Uses the bundled attributed GeoJSON snapshot; no download is required.
Existing telemetry and hazard records remain synthetic and are preserved.
"""
import json
import csv
from pathlib import Path
from seed_demo import OUT, records, sql, quote

SOURCE = OUT / 'victoria'
def main():
    csv.field_size_limit(10_000_000)
    SOURCE.mkdir(parents=True, exist_ok=True)
    geography = json.loads((Path(__file__).parent / 'fixtures/victoria-geography.json').read_text(encoding='utf8'))
    features = geography['features']
    geometries = {f['properties']['kind']: f['geometry'] for f in features}
    dam, reservoir, river = (geometries[k] for k in ['dam', 'reservoir', 'river'])
    midpoint = [geography['coordinate']['longitude'], geography['coordinate']['latitude']]
    inner = reservoir['coordinates'][1:]
    current = records("SELECT * FROM dams WHERE code='DEMO-002'")
    if len(current) != 1 or current[0]['name'] not in ('Demo Reservoir 02', 'Victoria Dam'):
        raise ValueError('Selected demo dam did not match')
    row = current[0]
    backup = SOURCE / 'before-victoria.json'
    if not backup.exists():
        backup.write_text(json.dumps(row, indent=2), encoding='utf-8')
    changes = dict(name='Victoria Dam', name_si='වික්ටෝරියා වේල්ල', name_ta='விக்டோரியா அணை',
        location_description='Victoria Dam, Teldeniya, Central Province. Reference geography: OpenStreetMap (2026-10-06). Telemetry, gates, sensors and hazard records are synthetic demo data.',
        latitude=midpoint[1], longitude=midpoint[0], map_center_latitude=midpoint[1], map_center_longitude=midpoint[0], map_default_zoom=12,
        dam_type='arch', height_meters=122, length_meters=520, reservoir_capacity_mcm=722, gross_storage_mcm=722, catchment_area_sqkm=1891, year_completed=1985, river_name='Mahaweli River',
        dam_boundary_geojson=dam, reservoir_boundary_geojson=reservoir, downstream_river_geojson=river)
    # Clear unsupported demo engineering facts instead of attributing them to a real dam.
    changes.update(live_storage_mcm=None, dead_storage_mcm=None, spillway_capacity_cumecs=None)
    sql("START TRANSACTION; INSERT INTO regions (name,state_province,country,created_at,updated_at) "
        "SELECT 'Kandy District','Central Province','Sri Lanka',NOW(),NOW() WHERE NOT EXISTS "
        "(SELECT 1 FROM regions WHERE name='Kandy District' AND country='Sri Lanka'); UPDATE dams SET "
        + ','.join(f'`{k}`={quote(v)}' for k,v in changes.items())
        + ",region_id=(SELECT id FROM regions WHERE name='Kandy District' AND country='Sri Lanka' ORDER BY id LIMIT 1)"
        + f" WHERE id={int(row['id'])} AND code='DEMO-002'; COMMIT;")
    # The web reference asset is already retained separately; seeding changes only the DB.
    checked = records("SELECT id,name,latitude,longitude,JSON_VALID(reservoir_boundary_geojson) valid FROM dams WHERE code='DEMO-002'")[0]
    assert checked['name'] == 'Victoria Dam' and checked['valid'] == '1'
    print(json.dumps({'dam': checked, 'features': len(features), 'shorelineVertices': len(reservoir['coordinates'][0]), 'islands': len(inner)}))


if __name__ == '__main__':
    main()
