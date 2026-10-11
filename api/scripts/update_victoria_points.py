"""Place Victoria's existing demo equipment, shelters and incidents plausibly.

No surveyed equipment or official shelter locations are implied. Other dams'
records and sensor readings are retained. Original rows are backed up first.
"""
import csv
import json
import math
import random
from seed_demo import OUT, records, sql, quote, demo_where
from scatter_demo import inside, random_point


def within(point, ring):
    x,y=point
    result=False
    for a,b in zip(ring,ring[1:]):
        if (a[1]>y)!=(b[1]>y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            result=not result
    return result


def main():
    csv.field_size_limit(10_000_000)
    dam=records("SELECT * FROM dams WHERE code='DEMO-002'")[0]
    assert dam['name']=='Victoria Dam'
    did,rid=int(dam['id']),int(dam['region_id'])
    lat,lon=float(dam['latitude']),float(dam['longitude'])
    kmx,kmy=111.32*math.cos(math.radians(lat)),111.32
    zones=records(f'SELECT * FROM dam_hazard_zones WHERE dam_id={did} AND '+demo_where('dam_hazard_zones')+' ORDER BY display_order')
    assert len(zones)==3 and all(z['zone_code'].startswith('VICTORIA-DEMO-L') for z in zones)
    rings={int(z['id']):json.loads(z['boundary_geojson'])['coordinates'][0] for z in zones}
    zone_levels={int(z['id']):int(z['hazard_level_id']) for z in zones}
    reservoir=json.loads(dam['reservoir_boundary_geojson'])['coordinates']
    river=json.loads(dam['downstream_river_geojson'])['coordinates']
    crest=json.loads(dam['dam_boundary_geojson'])['coordinates']
    def water(p): return within(p,reservoir[0]) and not any(within(p,r) for r in reservoir[1:])
    def distance(a,b): return math.hypot((a[0]-b[0])*kmx,(a[1]-b[1])*kmy)
    def point_at(km):
        travelled=0.
        for a,b in zip(river,river[1:]):
            step=distance(a,b)
            if travelled+step>=km:
                f=(km-travelled)/step
                return [a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]
            travelled+=step
        return river[-1]
    updates,backups,expected=[],{},[]
    rng=random.Random(20261006)
    def update(table,row,values):
        backups.setdefault(table,[]).append(row)
        updates.append('UPDATE `'+table+'` SET '+','.join(f'`{k}`={quote(v)}' for k,v in values.items())+f" WHERE id={int(row['id'])}")
        if 'latitude' in values: expected.append((table,int(row['id']),(values['longitude'],values['latitude'])))
    def coords(p): return {'longitude':round(p[0],8),'latitude':round(p[1],8)}

    gates=records(f'SELECT * FROM dam_gates WHERE dam_id={did} AND '+demo_where('dam_gates')+' ORDER BY gate_number')
    for i,row in enumerate(gates):
        p=crest[round((.35+.30*i/max(1,len(gates)-1))*(len(crest)-1))]
        update('dam_gates',row,coords(p))
    sensors=records(f'SELECT s.*,t.code sensor_kind FROM sensors s JOIN sensor_types t ON t.id=s.sensor_type_id WHERE s.dam_id={did} AND '+demo_where('sensors','s')+' ORDER BY s.id')
    water_points=[(lon+dx,lat+dy) for dx in [-.0008,-.0015,-.0025,-.004] for dy in [.0008,.0015,.0025,.004] if water((lon+dx,lat+dy))]
    assert len(water_points)>=2
    soil=point_at(3)
    positions={
        'WATER_LEVEL':(water_points[0],'Reservoir edge water-level gauge'),
        'INFLOW':(water_points[-1],'Upstream reservoir flow gauge'),
        'OUTFLOW':(point_at(.35),'Downstream release gauge'),
        'RAINFALL':((lon+.0025,lat+.0018),'East-bank rainfall station'),
        'TEMPERATURE':((lon+.0028,lat-.0004),'Dam service-area weather station'),
        'SOIL_MOISTURE':((soil[0]+.0028,soil[1]+.0014),'Downstream bank soil station'),
    }
    for row in sensors:
        p,label=positions[row['sensor_kind']]
        update('sensors',row,{**coords(p),'name':'Victoria Demo — '+row['sensor_kind'].replace('_',' ').title(),
            'description':'Illustrative demo equipment location and readings; not surveyed or live telemetry.',
            'location_on_dam':label,'elevation_meters':None})

    safe=records(f'SELECT * FROM system_safe_locations WHERE primary_dam_id={did} AND '+demo_where('system_safe_locations')+' ORDER BY id')
    assert len(safe)==3
    safe_points=[]
    for i,(row,name) in enumerate(zip(safe,['Ridge Assembly Point','Community Shelter','Medical Aid Point'])):
        base=point_at([1.2,4.5,8.5][i])
        for offset in [1.2,1.5,1.8,2.1]:
            for bearing in [math.pi/2,-math.pi/2,0,math.pi]:
                p=(base[0]+offset*math.cos(bearing)/kmx,base[1]+offset*math.sin(bearing)/kmy)
                if not water(p) and not any(inside(p,r) for r in rings.values()): break
            else: continue
            break
        else: raise ValueError('No land-based shelter candidate outside zones')
        p=(round(p[0],8),round(p[1],8))
        assert not water(p) and not any(inside(p,r) for r in rings.values())
        safe_points.append((int(row['id']),p))
        update('system_safe_locations',row,{**coords(p),'region_id':rid,'code':f'VICTORIA-DEMO-SAFE-{i+1:02}',
            'name':'Victoria Demo — '+name,'description':'Fictional demo shelter outside the illustrative danger corridors; not an official or verified evacuation location.',
            'address_text':'Victoria Dam area — illustrative demo location','address_si':None,'name_si':None,'name_ta':None,
            'capacity_persons':[150,250,80][i],'current_occupancy':0,'status':'active','show_on_map':1,'is_verified':0,
            'verified_at':None,'verified_by':None,'elevation_meters':None,'boundary_geojson':None,
            'contact_name':None,'contact_phone':None,'contact_email':None,'emergency_phone':None,
            'estimated_travel_time_minutes':None,'distance_from_dam_km':round(distance((lon,lat),p),2),
            'serves_hazard_zones':[int(z['id']) for z in zones],
            'marker_icon':['flag','building','hospital'][i],'marker_color':'#16a34a'})

    for table in ['reports','sos_events','user_hazard_location_snapshots']:
        for row in records(f'SELECT * FROM `{table}` WHERE dam_id={did} AND '+demo_where(table)+' ORDER BY id'):
            zid=int(row['hazard_zone_id']) if row.get('hazard_zone_id') not in [None,'NULL'] else int(zones[int(row['id'])%3]['id'])
            ring=rings.get(zid,rings[int(zones[0]['id'])])
            for _ in range(1000):
                p=random_point(rng,ring,.85)
                if not water(p): break
            else: raise ValueError('No land incident candidate')
            values={**coords(p),'region_id':rid}
            if 'hazard_level_id' in row: values['hazard_level_id']=zone_levels.get(zid,int(zones[0]['hazard_level_id']))
            if 'address_text' in row: values['address_text']='Victoria area — synthetic demo incident'
            if 'nearest_safe_location_id' in row:
                sid,sp=min(safe_points,key=lambda pair:distance(pair[1],p))
                values['nearest_safe_location_id']=sid
                if 'distance_to_safe_location_km' in row: values['distance_to_safe_location_km']=round(distance(sp,p),2)
            if 'distance_to_dam_km' in row: values['distance_to_dam_km']=round(distance((lon,lat),p),2)
            update(table,row,values)
    backup=OUT/'victoria/before-map-points.json'
    if not backup.exists(): backup.write_text(json.dumps(backups,indent=2),encoding='utf-8')
    sql('START TRANSACTION; '+';'.join(updates)+'; COMMIT;')
    for table,i,p in expected:
        row=records(f'SELECT latitude,longitude FROM `{table}` WHERE id={i}')[0]
        assert (float(row['longitude']),float(row['latitude']))==p
    checked=records(f'SELECT id,latitude,longitude FROM system_safe_locations WHERE primary_dam_id={did} AND '+demo_where('system_safe_locations'))
    assert all(not water((float(r['longitude']),float(r['latitude']))) and not any(inside((float(r['longitude']),float(r['latitude'])),ring) for ring in rings.values()) for r in checked)
    report={'updated':{t:len(rows) for t,rows in backups.items()},'sheltersOutsideDemoZones':True,'sheltersOnLand':True,'otherDamsPreserved':True}
    (OUT/'victoria/map-points-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))


if __name__=='__main__': main()
