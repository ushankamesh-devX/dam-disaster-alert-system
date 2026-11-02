"""Scatter seeded demo geography reproducibly; preserve non-demo records."""
import json
import random
import math
from seed_demo import OUT, records, sql, quote, docker

def hull(points):
    points=sorted(set(points))
    def cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower=[]; upper=[]
    for p in points:
        while len(lower)>1 and cross(lower[-2],lower[-1],p)<=0: lower.pop()
        lower.append(p)
    for p in reversed(points):
        while len(upper)>1 and cross(upper[-2],upper[-1],p)<=0: upper.pop()
        upper.append(p)
    ring=lower[:-1]+upper[:-1]
    return ring+[ring[0]]

def inside(point,ring):
    x,y=point
    return all((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])>=-1e-12 for a,b in zip(ring,ring[1:]))

def random_point(rng,ring,margin=.85):
    cx=sum(p[0] for p in ring[:-1])/(len(ring)-1)
    cy=sum(p[1] for p in ring[:-1])/(len(ring)-1)
    for _ in range(10000):
        p=(rng.uniform(min(p[0] for p in ring),max(p[0] for p in ring)),rng.uniform(min(p[1] for p in ring),max(p[1] for p in ring)))
        if inside(p,ring): return (round(cx+(p[0]-cx)*margin,8),round(cy+(p[1]-cy)*margin,8))
    raise RuntimeError('Unable to sample polygon')

def random_hull(rng,lon,lat,radius):
    ring=hull([(round(lon+rng.uniform(-radius,radius),8),round(lat+rng.uniform(-radius,radius),8)) for _ in range(32)])
    return {'type':'Polygon','coordinates':[ring]}

def apply(manifest):
    rng=random.Random(20261005)
    spans={r['table']:r['ids'] for r in manifest['tables'] if r['ids']}
    if not (OUT/'before-geography.sql').exists():
        backup=docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF $MYSQL_DATABASE')
        (OUT/'before-geography.sql').write_bytes(backup)
    updates=[]; expected=[]
    def load(t):
        lo,hi=spans[t]
        return records(f'SELECT * FROM `{t}` WHERE id BETWEEN {lo} AND {hi} ORDER BY id;')
    def update(t,i,values):
        updates.append(f'UPDATE `{t}` SET '+','.join(f'`{k}`={quote(v)}' for k,v in values.items())+f' WHERE id={i};')
    regions={}
    for i,r in enumerate(load('regions')):
        lat=7.02+i*.24; lon=80.58+[0,.09,-.03,.10,.04][i%5]
        geo=random_hull(rng,lon,lat,.085)
        regions[int(r['id'])]=geo['coordinates'][0]
        update('regions',int(r['id']),{'latitude':lat,'longitude':lon,'boundary_geojson':geo})
    dams={}
    for r in load('dams'):
        rid=int(r['region_id']); p=random_point(rng,regions[rid],.58)
        dams[int(r['id'])]=(p,rid)
        update('dams',int(r['id']),{'latitude':p[1],'longitude':p[0],'map_center_latitude':p[1],'map_center_longitude':p[0],
            'dam_boundary_geojson':random_hull(rng,*p,.0015),'reservoir_boundary_geojson':random_hull(rng,p[0],p[1]+.004,.004),
            'downstream_river_geojson':{'type':'LineString','coordinates':[list(p),[p[0]+.002,p[1]-.006],[p[0]-.001,p[1]-.013]]}})
        expected.append(('dams',int(r['id']),p,rid))
    zones={}
    levels={int(r['level_number']):r for r in records('SELECT id,name,level_number,color FROM hazard_levels ORDER BY id;')}
    grouped={}
    for r in load('dam_hazard_zones'): grouped.setdefault(int(r['dam_id']),[]).append(r)
    nesting_checks=0
    for did,rows in grouped.items():
        (lon,lat),rid=dams[did]
        # Shared downstream axis and centre. Scaled copies guarantee containment;
        # these are synthetic contours, not a terrain-based flood prediction.
        cx,cy=lon+.0003,lat-.002
        width=rng.uniform(.005,.007); length=rng.uniform(.012,.015)
        heading=math.atan2(.15,-1)
        outer=None; previous_area=None
        for index,r in enumerate(rows):
            risk=1+round(index*4/max(1,len(rows)-1))
            level=levels[risk]; scale=1-index*.62/max(1,len(rows)-1)
            ring=[]
            for vertex in range(64):
                theta=2*math.pi*vertex/64
                along=length*scale*math.cos(theta); across=width*scale*math.sin(theta)
                ring.append((round(cx+along*math.sin(heading)+across*math.cos(heading),8),
                             round(cy+along*math.cos(heading)-across*math.sin(heading),8)))
            ring=hull(ring)
            if outer and not all(inside(p,outer) for p in ring): raise RuntimeError('Hazard contours are not nested')
            if not all(inside(p,regions[rid]) for p in ring): raise RuntimeError('Hazard contour outside region')
            if outer: nesting_checks+=1
            outer=ring
            kmx=111.32*math.cos(math.radians(cy)); kmy=111.32
            area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:])))*kmx*kmy/2
            perimeter=sum(math.hypot((b[0]-a[0])*kmx,(b[1]-a[1])*kmy) for a,b in zip(ring,ring[1:]))
            if previous_area and area>=previous_area: raise RuntimeError('Hazard area must decrease with risk')
            previous_area=area
            zones[int(r['id'])]=(ring,rid)
            update('dam_hazard_zones',int(r['id']),{
                'boundary_geojson':{'type':'Polygon','coordinates':[ring]},'center_latitude':round(cy,8),
                'center_longitude':round(cx,8),'label_position':{'lat':ring[0][1],'lng':ring[0][0]},
                'hazard_level_id':int(level['id']),'zone_name':f"Demo {level['name']} hazard contour",
                'description':'Synthetic downstream contour; higher risk is inside lower risk. Not a validated flood boundary.',
                'fill_color':level['color'],'stroke_color':level['color'],'fill_opacity':.25,'stroke_width':2,
                'display_order':risk,'area_sq_km':round(area,4),'perimeter_km':round(perimeter,4),
                'distance_from_dam_km':round(math.hypot((cx-lon)*kmx,(cy-lat)*kmy),2),
                'estimated_flood_arrival_minutes':None,'estimated_water_depth_meters':None,'flood_velocity_mps':None,
                'is_verified':0,'verified_at':None,'verified_by':None})
    columns=records('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE();')
    schema={t:{c['COLUMN_NAME'] for c in columns if c['TABLE_NAME']==t} for t in spans}
    pairs=[('latitude','longitude'),('last_known_latitude','last_known_longitude'),('last_latitude','last_longitude'),('user_latitude','user_longitude')]
    counts={}
    for t in sorted(spans):
        if t in ['regions','dams','dam_hazard_zones']: continue
        active=[(a,b) for a,b in pairs if a in schema[t] and b in schema[t]]
        if not active: continue
        for r in load(t):
            rid=int(r['region_id']) if r.get('region_id') not in [None,'NULL'] else None
            did=next((int(r[n]) for n in ['dam_id','primary_dam_id','nearest_dam_id'] if r.get(n) not in [None,'NULL']),None)
            zid=int(r['hazard_zone_id']) if r.get('hazard_zone_id') not in [None,'NULL'] else None
            if zid in zones:
                ring,rid=zones[zid]; p=random_point(rng,ring)
            elif t in ['sensors','dam_gates'] and did in dams:
                (lon,lat),rid=dams[did]; p=(round(lon+rng.uniform(-.001,.001),8),round(lat+rng.uniform(-.001,.001),8))
            else:
                if rid not in regions: rid=dams[did][1] if did in dams else list(regions)[rng.randrange(len(regions))]
                p=random_point(rng,regions[rid])
            values={}
            for a,b in active: values[a]=p[1]; values[b]=p[0]
            if 'region_id' in schema[t]: values['region_id']=rid
            if 'boundary_geojson' in schema[t]: values['boundary_geojson']=random_hull(rng,*p,.001)
            if 'service_area_geojson' in schema[t]: values['service_area_geojson']=random_hull(rng,*p,.003)
            update(t,int(r['id']),values)
            expected.append((t,int(r['id']),p,rid))
            counts[t]=counts.get(t,0)+1
    for t in ['sos_events','user_hazard_location_snapshots']:
        lo,hi=spans[t]
        updates.append(f'UPDATE `{t}` s JOIN dam_hazard_zones z ON z.id=s.hazard_zone_id SET s.hazard_level_id=z.hazard_level_id WHERE s.id BETWEEN {lo} AND {hi};')
    sql('START TRANSACTION;\n'+'\n'.join(updates)+'\nCOMMIT;')
    persisted={}
    for r in load('dam_hazard_zones'):
        persisted.setdefault(int(r['dam_id']),[]).append(r)
    for rows in persisted.values():
        rows.sort(key=lambda r:int(r['display_order']))
        for low,high in zip(rows,rows[1:]):
            outer=json.loads(low['boundary_geojson'])['coordinates'][0]
            inner=json.loads(high['boundary_geojson'])['coordinates'][0]
            if not all(inside(p,outer) for p in inner) or float(high['area_sq_km'])>=float(low['area_sq_km']):
                raise RuntimeError('Persisted hazard nesting failed')
    # Read back the actual persisted points and validate convex containment.
    for t in sorted({e[0] for e in expected}):
        actual={int(r['id']):r for r in load(t)}
        a,b=next((a,b) for a,b in pairs if a in schema[t] and b in schema[t])
        for table,i,p,rid in expected:
            if table!=t: continue
            stored=(float(actual[i][b]),float(actual[i][a]))
            if stored!=p or not inside(stored,regions[rid]): raise RuntimeError(f'Invalid persisted point {t}/{i}')
    safe=[e[2] for e in expected if e[0]=='system_safe_locations']
    if len(set(safe))!=len(safe): raise RuntimeError('Duplicate safe-location points')
    report={'random_seed':20261005,'region_hulls':len(regions),'hazard_contours':len(zones),'nested_dams':len(grouped),'nesting_checks':nesting_checks,'higher_risk_inside_lower_risk':True,'scattered_points':len(expected),'safe_locations':len(safe),'unique_safe_locations':len(set(safe)),'points_inside_assigned_regions':True,'tables':counts}
    manifest['geography']=report
    (OUT/'seed-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    print(json.dumps(report))

if __name__=='__main__': apply(json.loads((OUT/'seed-manifest.json').read_text(encoding='utf8')))
