"""Create three approximate Victoria demo danger contours; never verified forecasts."""
import csv
import json
import math
from seed_demo import OUT, records, sql, quote, demo_where
from scatter_demo import hull, inside


def main():
    csv.field_size_limit(10_000_000)
    dam = records("SELECT id,name,downstream_river_geojson FROM dams WHERE code='DEMO-002'")[0]
    assert dam['name'] == 'Victoria Dam'
    zones = records(f"SELECT * FROM dam_hazard_zones WHERE dam_id={int(dam['id'])} AND "+demo_where('dam_hazard_zones')+' ORDER BY id')
    assert len(zones) == 3, 'Expected exactly three existing demo zones'
    backup = OUT / 'victoria/before-danger-zones.json'
    if not backup.exists():
        backup.write_text(json.dumps(zones, indent=2), encoding='utf-8')
    levels = {int(r['level_number']): int(r['id']) for r in records('SELECT id,level_number FROM hazard_levels')}
    river = json.loads(dam['downstream_river_geojson'])['coordinates']
    lon0, lat0 = river[0]
    kmx, kmy = 111.32 * math.cos(math.radians(lat0)), 111.32
    path = [(0., 0.)]
    total = 0.
    for a, b in zip(river, river[1:]):
        total += math.hypot((b[0]-a[0])*kmx, (b[1]-a[1])*kmy)
        path.append(((b[0]-lon0)*kmx, (b[1]-lat0)*kmy, total))
    path[0] = (0., 0., 0.)
    updates, rings = [], []
    for row, (level, reach, width, color, severity) in zip(zones, [
        (1, 10., .65, '#eab308', 'Caution'),
        (2, 5., .40, '#f97316', 'High danger'),
        (3, 2., .20, '#ef4444', 'Critical danger'),
    ]):
        centres = [(x, y) for x,y,distance in path if distance <= reach]
        for a,b in zip(path,path[1:]):
            if a[2] <= reach < b[2]:
                ratio = (reach-a[2])/(b[2]-a[2])
                centres.append((a[0]+ratio*(b[0]-a[0]), a[1]+ratio*(b[1]-a[1])))
                break
        # A tapered river corridor, with rounded ends. The convex envelope keeps
        # the illustrative contours simple, closed and nested through river bends.
        points = []
        for i,(x,y) in enumerate(centres):
            radius = width * (.72 + .28*i/max(1,len(centres)-1))
            points.extend((lon0+(x+radius*math.cos(t*math.pi/12))/kmx,
                           lat0+(y+radius*math.sin(t*math.pi/12))/kmy) for t in range(24))
        ring = hull(points)
        assert not rings or all(inside(p, rings[-1]) for p in ring), 'Contours must be nested'
        rings.append(ring)
        area = abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]))) * kmx*kmy/2
        x,y = centres[len(centres)//2]
        fields = dict(hazard_level_id=levels[level], zone_code=f'VICTORIA-DEMO-L{level}',
            zone_name=f'Danger Level {level} — {severity}',
            description=f'Demo {severity.lower()} corridor, approximately {reach:g} km downstream. Illustrative only; not a flood forecast.',
            boundary_geojson={'type':'Polygon','coordinates':[ring]},
            center_latitude=lat0+y/kmy, center_longitude=lon0+x/kmx,
            label_position={'lat':lat0+y/kmy,'lng':lon0+x/kmx},
            area_sq_km=round(area,4), distance_from_dam_km=round(math.hypot(x,y),2),
            perimeter_km=round(sum(math.hypot((b[0]-a[0])*kmx,(b[1]-a[1])*kmy) for a,b in zip(ring,ring[1:])),4),
            fill_color=color, stroke_color=color, fill_opacity=.22, stroke_width=2,
            display_order=level, show_label=1, is_active=1, is_verified=0,
            verified_at=None, verified_by=None, estimated_flood_arrival_minutes=None,
            estimated_water_depth_meters=None, flood_velocity_mps=None)
        updates.append('UPDATE dam_hazard_zones SET '+','.join(f'`{k}`={quote(v)}' for k,v in fields.items())+f" WHERE id={int(row['id'])} AND dam_id={int(dam['id'])}")
    sql('START TRANSACTION; '+';'.join(updates)+'; COMMIT;')
    checked=records(f"SELECT zone_code,CAST(is_active AS UNSIGNED) is_active,CAST(is_verified AS UNSIGNED) is_verified,JSON_VALID(boundary_geojson) valid FROM dam_hazard_zones WHERE dam_id={int(dam['id'])} AND "+demo_where('dam_hazard_zones')+' ORDER BY display_order')
    assert len(checked)==3 and all(r['is_active']=='1' and r['is_verified']=='0' and r['valid']=='1' for r in checked)
    print(json.dumps({'zones':checked,'nestedContours':True}))


if __name__ == '__main__':
    main()
