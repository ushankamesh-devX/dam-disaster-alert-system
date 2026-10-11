"""Local DDAS demo seed. Uses Docker's MySQL client; no Python packages required.
Run from api: python scripts/seed_demo.py
Preserves existing rows, backs up first, and commits demo rows as one transaction.
"""
import csv
import io
import json
import math
import re
import subprocess
import uuid
import os
import argparse
import sys
from functools import lru_cache
from pathlib import Path
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[1]
DATABASE = os.environ.get('DDAS_SEED_DATABASE', 'dam_disaster_db')
if not re.fullmatch(r'[A-Za-z0-9_]+', DATABASE):
    raise ValueError('DDAS_SEED_DATABASE must contain only letters, digits and underscores')
OUT = ROOT / 'local-data' / DATABASE
NOW = datetime.now(timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)
NS = uuid.UUID('5c790cf5-146a-458b-9936-f8c05757ead0')
if __name__ == '__main__':
    sys.modules['seed_demo'] = sys.modules[__name__]

@lru_cache(maxsize=1)
def compose_command():
    for command in [['docker','compose'],['docker-compose']]:
        try:
            result=subprocess.run(command+['version'],capture_output=True)
            if result.returncode==0: return command
        except FileNotFoundError:
            pass
    raise RuntimeError('Docker Compose is required; install/start Docker before setup')


def docker(command, data=None):
    command = command.replace('$MYSQL_DATABASE', DATABASE)
    p = subprocess.run(compose_command()+['exec', '-T', 'mysql', 'sh', '-c', command],
                       cwd=ROOT, input=data, capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf8', errors='replace'))
    return p.stdout

CLIENT = 'export MYSQL_PWD=$MYSQL_PASSWORD; exec mysql --user=$MYSQL_USER --database=$MYSQL_DATABASE --default-character-set=utf8mb4 --batch --raw'
def sql(query):
    return docker(CLIENT, query.encode('utf8')).decode('utf8')
def records(query):
    return list(csv.DictReader(io.StringIO(sql(query)), delimiter='\t'))
def quote(v):
    if v is None: return 'NULL'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): v = json.dumps(v, ensure_ascii=False)
    return "'" + str(v).replace('\\', '\\\\').replace("'", "''") + "'"
def stamp(v): return v.strftime('%Y-%m-%d %H:%M:%S')
def polygon(lat, lon, size=.008):
    return {'type':'Polygon','coordinates':[[[lon-size,lat-size],[lon+size,lat-size],[lon+size,lat+size],[lon-size,lat+size],[lon-size,lat-size]]]}

def finalize(manifest):
    """Align derived state and validate all actual FK relationships after insertion."""
    spans={r['table']:r['ids'] for r in manifest['tables'] if r['ids']}
    def where(t,alias):
        lo,hi=spans[t]
        return f'{alias}.id BETWEEN {lo} AND {hi}'
    updates=[]
    updates.append('UPDATE dam_gates g JOIN dams d ON d.id=g.dam_id SET g.latitude=d.latitude,g.longitude=d.longitude WHERE '+where('dam_gates','g'))
    updates.append('UPDATE gate_operation_logs l JOIN dam_gates g ON g.id=l.gate_id SET l.dam_id=g.dam_id,l.opening_before=0,l.opening_after=g.current_opening_meters,l.operation_type=IF(g.current_opening_meters>0,"partial_open","close") WHERE '+where('gate_operation_logs','l'))
    updates.append('UPDATE dam_hazard_zone_history h JOIN dam_hazard_zones z ON z.id=h.zone_id SET h.dam_id=z.dam_id WHERE '+where('dam_hazard_zone_history','h'))
    updates.append('UPDATE dam_hazard_assessments h JOIN dams d ON d.id=h.dam_id SET h.new_hazard_level_id=d.overall_hazard_level_id,h.new_status=d.overall_hazard_status WHERE '+where('dam_hazard_assessments','h'))
    updates.append('UPDATE reports r SET r.resolved_at=IF(r.status="resolved",DATE_ADD(r.created_at,INTERVAL 1 HOUR),NULL),r.resolved_by=IF(r.status="resolved",(SELECT id FROM users WHERE email="admin@ddas.gov.lk"),NULL),r.resolution_notes=IF(r.status="resolved","Synthetic report resolved during demo exercise",NULL),r.rejection_reason=IF(r.status="rejected","Synthetic report rejected during demo review",NULL),r.duplicate_of_id=NULL,r.related_alert_id=NULL WHERE '+where('reports','r'))
    updates.append('UPDATE report_status_history h JOIN reports r ON r.id=h.report_id SET h.new_status=r.status,h.created_at=DATE_ADD(r.created_at,INTERVAL 1 HOUR) WHERE '+where('report_status_history','h'))
    updates.append('UPDATE reports r SET r.comment_count=(SELECT COUNT(*) FROM report_comments c WHERE c.report_id=r.id),r.upvote_count=(SELECT COUNT(*) FROM report_upvotes u WHERE u.report_id=r.id) WHERE '+where('reports','r'))
    updates.append('UPDATE news_user_interactions i JOIN news_articles a ON a.id=i.article_id SET i.viewed_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR),i.saved_at=NULL,i.shared_at=NULL,i.created_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR) WHERE '+where('news_user_interactions','i'))
    updates.append('UPDATE news_articles a SET a.view_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_viewed=1),a.save_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_saved=1),a.share_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_shared=1) WHERE '+where('news_articles','a'))
    updates.append('UPDATE news_push_logs l JOIN news_articles a ON a.id=l.article_id SET l.provider="DEMO-NO-SEND",l.total_recipients=100,l.sent_count=100,l.delivered_count=95,l.failed_count=5,l.opened_count=40,l.sent_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR),l.completed_at=DATE_ADD(a.publish_date,INTERVAL 2 HOUR),l.error_summary=JSON_OBJECT("synthetic",TRUE,"simulated_failures",5) WHERE '+where('news_push_logs','l'))
    updates.append('UPDATE alert_user_deliveries l JOIN alerts a ON a.id=l.alert_id SET l.push_status="delivered",l.push_sent_at=DATE_ADD(a.created_at,INTERVAL 1 MINUTE),l.push_delivered_at=DATE_ADD(a.created_at,INTERVAL 2 MINUTE),l.sms_status="disabled",l.email_status="disabled",l.sms_sent_at=NULL,l.sms_delivered_at=NULL,l.email_sent_at=NULL,l.email_delivered_at=NULL,l.push_error=NULL,l.sms_error=NULL,l.email_error=NULL,l.read_at=DATE_ADD(a.created_at,INTERVAL 3 MINUTE) WHERE '+where('alert_user_deliveries','l'))
    updates.append('UPDATE alert_acknowledgments k JOIN alerts a ON a.id=k.alert_id SET k.responded_at=DATE_ADD(a.created_at,INTERVAL 4 MINUTE) WHERE '+where('alert_acknowledgments','k'))
    updates.append('UPDATE alert_escalations e JOIN alerts a ON a.id=e.alert_id SET e.escalated_at=DATE_ADD(a.created_at,INTERVAL 5 MINUTE),e.previous_severity="warning",e.new_severity="critical" WHERE '+where('alert_escalations','e'))
    updates.append('UPDATE user_hazard_location_snapshots s JOIN dam_hazard_zones z ON z.id=s.hazard_zone_id JOIN dams d ON d.id=z.dam_id SET s.dam_id=z.dam_id,s.region_id=d.region_id,s.hazard_level_id=z.hazard_level_id,s.latitude=z.center_latitude,s.longitude=z.center_longitude WHERE '+where('user_hazard_location_snapshots','s'))
    updates.append('UPDATE sos_events s JOIN dam_hazard_zones z ON z.id=s.hazard_zone_id JOIN dams d ON d.id=z.dam_id SET s.dam_id=z.dam_id,s.region_id=d.region_id,s.hazard_level_id=z.hazard_level_id,s.latitude=z.center_latitude,s.longitude=z.center_longitude,s.status="resolved",s.acknowledged_at=DATE_ADD(s.triggered_at,INTERVAL 1 MINUTE),s.responding_at=DATE_ADD(s.triggered_at,INTERVAL 5 MINUTE),s.resolved_at=DATE_ADD(s.triggered_at,INTERVAL 30 MINUTE),s.cancelled_at=NULL,s.cancellation_reason=NULL WHERE '+where('sos_events','s'))
    updates.append('UPDATE sos_event_notifications n JOIN sos_events s ON s.id=n.sos_event_id SET n.provider="DEMO-NO-SEND",n.channel="in_app",n.status="delivered",n.queued_at=s.triggered_at,n.sent_at=DATE_ADD(s.triggered_at,INTERVAL 1 MINUTE),n.delivered_at=DATE_ADD(s.triggered_at,INTERVAL 2 MINUTE),n.failed_at=NULL,n.next_retry_at=NULL,n.error_code=NULL,n.error_message=NULL WHERE '+where('sos_event_notifications','n'))
    updates.append('UPDATE location_sharing_sessions s SET s.expires_at=DATE_ADD(s.started_at,INTERVAL 1 HOUR),s.ended_at=DATE_ADD(s.started_at,INTERVAL 1 HOUR),s.status="ended" WHERE '+where('location_sharing_sessions','s'))
    updates.append('UPDATE dam_current_status st JOIN dams d ON d.id=st.dam_id SET '
        'st.total_gates_count=(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id),'
        'st.gates_open_count=(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id AND g.current_opening_meters>0),'
        'st.hazard_value=d.overall_hazard_status,'
        'st.active_hazard_zones=(SELECT JSON_ARRAYAGG(z.id) FROM dam_hazard_zones z WHERE z.dam_id=d.id AND z.is_active=1) '
        'WHERE '+where('dam_current_status','st'))
    sql('START TRANSACTION;\n'+';\n'.join(updates)+';\nCOMMIT;')
    fk_rows=records('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;')
    checks=[]
    for r in fk_rows:
        t,c,p,pc=(r[k] for k in ['TABLE_NAME','COLUMN_NAME','REFERENCED_TABLE_NAME','REFERENCED_COLUMN_NAME'])
        checks.append(f'SELECT {quote(t+"."+c)} AS relationship,COUNT(*) AS orphan_count FROM `{t}` child LEFT JOIN `{p}` parent ON child.`{c}`=parent.`{pc}` WHERE child.`{c}` IS NOT NULL AND parent.`{pc}` IS NULL')
    result=records(' UNION ALL '.join(checks)+';')
    failures=[r for r in result if int(r['orphan_count'])]
    if failures: raise RuntimeError('Foreign-key validation failed: '+str(failures))
    manifest['validation']={'foreign_key_relationships_checked':len(result),'orphan_count':0}
    (OUT/'seed-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    print(f'Validated {len(result)} foreign-key relationships; no orphan records.',flush=True)
    from scatter_demo import apply as scatter_geography
    scatter_geography(manifest)

def seed_base():
    tables = [r['TABLE_NAME'] for r in records('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE="BASE TABLE";')]
    if 'dams' in tables and records("SELECT id FROM dams WHERE code LIKE 'DEMO-%' LIMIT 1;"):
        raise RuntimeError('Demo rows already exist; refusing to duplicate them.')
    if not (OUT / 'before-demo.sql').exists():
        backup = docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF $MYSQL_DATABASE')
        (OUT / 'before-demo.sql').write_bytes(backup)
    print('Local database backup saved.', flush=True)
    created = []
    initialize_rbac()
    columns = records('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY ORDINAL_POSITION;')
    schema = {t:[c for c in columns if c['TABLE_NAME']==t] for t in tables}
    fks = records('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;')
    refs = {(r['TABLE_NAME'],r['COLUMN_NAME']):r['REFERENCED_TABLE_NAME'] for r in fks}
    # Also honor logical relationships which Hibernate does not enforce as SQL FKs.
    aliases = {'dam_id':'dams','primary_dam_id':'dams','region_id':'regions','sensor_id':'sensors','user_id':'users','admin_id':'users','created_by':'users','updated_by':'users','operated_by':'users','verified_by':'users','assessed_by':'users','assigned_to':'users','assigned_by':'users','changed_by':'users','uploaded_by':'users','author_id':'users','permission_id':'permissions','role_id':'roles','old_role_id':'roles','new_role_id':'roles','alert_id':'alerts','report_id':'reports','article_id':'news_articles','gate_id':'dam_gates','zone_id':'dam_hazard_zones','hazard_level_id':'hazard_levels','current_hazard_level_id':'hazard_levels','overall_hazard_level_id':'hazard_levels','previous_hazard_level_id':'hazard_levels','new_hazard_level_id':'hazard_levels'}
    for t in tables:
        for c in schema[t]:
            n=c['COLUMN_NAME']
            if n in aliases and c['COLUMN_TYPE'].startswith(('bigint','int')): refs.setdefault((t,n),aliases[n])
    existing = {t:[] for t in tables}
    starts = {}
    id_tables=[t for t in tables if any(c['COLUMN_NAME']=='id' for c in schema[t])]
    for r in records(' UNION ALL '.join(f"SELECT '{t}' AS tbl,id FROM `{t}`" for t in id_tables)+';'):
        existing[r['tbl']].append(int(r['id']))
    for t in tables: starts[t]=max(existing[t],default=0)+1
    supported = set(re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)', ''.join(
        (ROOT / 'DB SCHEMA' / s).read_text(encoding='utf8') for s in
        ['ddas_complete_schema.sql', 'ddas_news_schema.sql', 'migrations/add_device_api_keys.sql']))) | {'alert_audit_logs'}
    counts = {t:20 if t in supported else 0 for t in tables}
    counts.update(users=100,regions=5,dams=10,dam_current_status=10,dam_gates=30,dam_hazard_zones=30,sensors=60,sensor_readings=43200,sensor_readings_aggregated=1800,alerts=100,reports=150,news_articles=30,system_safe_locations=30,news_user_interactions=100,news_subscriptions=100,alert_user_deliveries=100,alert_acknowledgments=100,report_upvotes=100,report_comments=150,report_status_history=150,report_media=30,device_api_keys=6)
    counts.update(roles=0,permissions=0,role_permissions=0,hazard_levels=5,sensor_types=6,alert_types=4,report_types=6,location_types=4,news_categories=4,contact_relationship_types=4,sos_event_types=4,dam_custom_field_definitions=4,dam_field_templates=2,dam_field_template_items=8)
    # Preserve initialized lookup rows rather than duplicating them.
    for t in ['roles','permissions','hazard_levels','sensor_types','alert_types','report_types','location_types','news_categories','contact_relationship_types','sos_event_types']:
        if existing[t]: counts[t]=0
    ids={t:list(range(starts[t],starts[t]+counts[t])) if counts[t] else existing[t] for t in tables}
    ids['sensor_types'] = [int(r['id']) for code in ['WATER_LEVEL','RAINFALL','INFLOW','OUTFLOW','SOIL_MOISTURE','TEMPERATURE']
        for r in records(f'SELECT id FROM sensor_types WHERE code={quote(code)}')] if existing['sensor_types'] else ids['sensor_types']
    ids['hazard_levels'] = [int(r['id']) for r in records('SELECT id FROM hazard_levels ORDER BY level_number')] if existing['hazard_levels'] else ids['hazard_levels']
    if len(ids['sensor_types']) != 6 or len(ids['hazard_levels']) != 5:
        raise RuntimeError('Expected six sensor type codes and five hazard levels; existing lookups are incomplete')
    refs[('dam_current_status','__readings_dependency')]='sensor_readings'
    refs[('sensor_readings_aggregated','__readings_dependency')]='sensor_readings'
    pending=set(tables); order=[]
    while pending:
        ready=sorted(t for t in pending if counts[t]==0 or all(parent not in pending or parent==t or counts[parent]==0 for (child,_),parent in refs.items() if child==t))
        if not ready: raise RuntimeError('Dependency cycle: '+str(pending))
        order.extend(ready); pending.difference_update(ready)
    rows={t:[] for t in tables}
    def ref(t,n,i):
        parent=refs.get((t,n)); pool=ids.get(parent,[])
        return pool[i%len(pool)] if pool else None
    sensor_codes=['WATER_LEVEL','RAINFALL','INFLOW','OUTFLOW','SOIL_MOISTURE','TEMPERATURE']
    units=['m','mm/hr','cumecs','cumecs','%','C']
    hazard_names=['Low','Moderate','High','Severe','Critical']
    colors=['#22C55E','#EAB308','#F97316','#EF4444','#991B1B']
    normal_role_id=int(records("SELECT id FROM roles WHERE code='NORMAL_USER'")[0]['id'])
    def value(t,c,i):
        n=c['COLUMN_NAME']; typ=c['COLUMN_TYPE']; j=i+1
        if n=='id': return starts[t]+i
        if n in ['deleted_at','push_token','image_url','avatar_url','thumbnail_url','gallery_urls','file_url']: return None
        if (t,n) in refs: return ref(t,n,i)
        if n=='uuid': return str(uuid.uuid5(NS,f'{t}/{j}'))
        if typ.startswith(('enum','set')):
            opts=re.findall(r"'([^']*)'",typ)
            preferred={'status':'active','quality':'good','language_preference':'en','dam_type':'gravity','gate_type':'radial','severity':'warning','purpose':'hydropower','priority':'medium','priority_level':'medium','aggregation_type':'daily','new_status':'resolved','previous_status':'pending','operation_mode':'manual','push_status':'delivered','sms_status':'disabled','email_status':'disabled','response_type':'acknowledged','file_type':'image'}
            if t=='reports' and n=='status': return ['pending','reviewing','in_progress','resolved','rejected'][i%5]
            if t=='alerts' and n=='status': return ['active','resolved','expired','draft'][i%4]
            if t=='news_articles' and n=='status': return 'published'
            if t=='dam_gates' and n=='status': return 'partial' if i%3==0 else 'closed'
            if t=='sensors' and n=='status': return 'faulty' if i%17==0 else 'active'
            return preferred.get(n) if preferred.get(n) in opts else opts[i%len(opts)]
        if n=='level_number': return j
        if n in ['code','zone_code','sensor_uid','report_number','filter_key'] or n.endswith('_code'): return f'DEMO-{j:03}'
        if n=='email' or n.endswith('_email'): return f'demo{j:03}@example.invalid'
        if 'phone' in n: return None if c['IS_NULLABLE']=='YES' else f'+94000{j:07}'
        if n=='password_hash': return 'DEMO-NO-LOGIN'
        if n=='session_token': return f'DEMO-INACTIVE-SESSION-{j}'
        if n=='api_key_hash': return __import__('hashlib').sha256(f'DEMO-DISABLED-{j}'.encode()).hexdigest()
        if n=='key_prefix': return f'DEMO{j:06}'
        if n=='unit': return 'm'
        if n in ['color','fill_color','stroke_color','marker_color']: return colors[i%5]
        if n=='name' or n in ['full_name','zone_name','title']: return f'Demo {t.replace("_"," ").title()} {j:03}'
        if 'latitude' in n: return round(7.05+(i%10)*.045,6)
        if 'longitude' in n: return round(80.55+(i%10)*.032,6)
        if typ=='json':
            if 'geojson' in n: return polygon(7.05+(i%10)*.045,80.55+(i%10)*.032)
            if n=='label_position': return {'lat':7.05,'lng':80.55}
            if n in ['active_hazard_zones','serves_hazard_zones','affected_regions','safe_location_ids']: return []
            return {'synthetic':True,'seed':'ddas-demo-v1'}
        if typ.startswith(('datetime','timestamp','date')):
            if n in ['expires_at','expiry_date','next_inspection_date','next_calibration_date']: return stamp(NOW+timedelta(days=30))
            if n in ['period_end','completed_at','resolved_at','responded_at']: return stamp(NOW-timedelta(hours=1))
            return stamp(NOW-timedelta(days=(i%30)+1))
        if typ=='year': return 2000+i%20
        if typ.startswith('time'): return '22:00:00' if n.endswith('start') else '06:00:00'
        if typ.startswith(('bit','tinyint(1)')):
            return 0 if n in ['notification_enabled','push_enabled','sms_enabled','email_enabled','is_anonymous','is_default','push_sent'] or (t=='device_api_keys' and n=='is_active') else 1
        if typ.startswith(('int','bigint','smallint','tinyint')):
            if n=='read_progress': return 100
            if n=='capacity_persons': return 250
            if n=='current_occupancy': return 25
            if n=='gate_number': return j
            if n=='reading_interval_seconds': return 3600
            return j
        if typ.startswith(('decimal','float','double')):
            if 'opacity' in n: return .35
            if 'percentage' in n or n in ['battery_level','signal_strength']: return 75
            if n=='max_opening_meters': return 5
            if n=='current_opening_meters': return 1 if i%3==0 else 0
            m=re.search(r'decimal\((\d+),(\d+)\)',typ)
            return min(10+j,10**(int(m[1])-int(m[2]))-1) if m else 10+j
        if n in ['ip_address']: return '127.0.0.1'
        if n in ['file_path']: return '/demo/demo-report.svg'
        if n=='file_name': return 'demo-report.svg'
        if n=='mime_type': return 'image/svg+xml'
        size=re.search(r'(?:varchar|char)\((\d+)\)',typ)
        s=f'Demo {j:03} {t.replace("_"," ")}'
        return s[:int(size[1])] if size else s
    for t in order:
        for i in range(counts[t]):
            row={c['COLUMN_NAME']:value(t,c,i) for c in schema[t]}
            for c in schema[t]:
                n=c['COLUMN_NAME']
                if row[n] is None and c['IS_NULLABLE']=='NO': raise RuntimeError(f'Missing required value {t}.{n}')
            if t=='sensor_types': row.update(code=sensor_codes[i],name=sensor_codes[i].replace('_',' ').title(),unit=units[i],min_threshold=0,max_threshold=150 if i==0 else 5000,critical_threshold=95 if i==0 else 4000)
            if t=='hazard_levels': row.update(code=f'LEVEL_{i+1}',name=hazard_names[i],level_number=i+1,color=colors[i],risk_score_min=i*20,risk_score_max=(i+1)*20)
            if t=='regions': row.update(name=f'Demo Region {i+1}',country='Sri Lanka')
            if t=='dam_field_template_items': row.update(template_id=ids['dam_field_templates'][i//4],field_id=ids['dam_custom_field_definitions'][i%4])
            if t=='users': row.update(role_id=normal_role_id,full_name=f'Demo Resident {i+1:03}',status='active')
            if t=='dams':
                row.update(name=f'Demo Reservoir {i+1:02}',height_meters=110,length_meters=300,reservoir_capacity_mcm=500,gross_storage_mcm=500,live_storage_mcm=450,dead_storage_mcm=50,overall_hazard_status=['low','moderate','high','severe','critical'][i%5],overall_hazard_level_id=ids['hazard_levels'][i%5],map_default_zoom=12)
            if t=='sensors':
                d=i//6; k=i%6
                row.update(dam_id=ids['dams'][d],sensor_type_id=ids['sensor_types'][k],name=f'Demo Reservoir {d+1:02} {sensor_codes[k]}',min_reading=0,max_reading=150 if k==0 else 5000,warning_threshold=85 if k==0 else 3500,critical_threshold=95 if k==0 else 4000,last_reading_at=stamp(NOW),latitude=7.05+d*.045,longitude=80.55+d*.032)
            if t=='sensor_readings':
                s=i//720; h=i%720; d=s//6; k=s%6
                baseline=[65+7*(d%5),2+4*(d%5),200+80*(d%5),180+60*(d%5),35+8*(d%5),27][k]
                v=round(baseline+math.sin(h/24)*[3,2,20,15,4,2][k],4)
                at=NOW-timedelta(hours=719-h)
                row.update(sensor_id=ids['sensors'][s],dam_id=ids['dams'][d],reading_value=v,unit=units[k],recorded_at=stamp(at),received_at=stamp(at+timedelta(seconds=5)),quality='suspect' if s%17==0 else 'good')
            if t=='sensor_readings_aggregated':
                s=i//30; day=i%30; readings=rows['sensor_readings'][s*720+day*24:s*720+(day+1)*24]; vals=[r['reading_value'] for r in readings]
                row.update(sensor_id=ids['sensors'][s],dam_id=ids['dams'][s//6],aggregation_type='daily',period_start=readings[0]['recorded_at'],period_end=stamp(datetime.fromisoformat(readings[-1]['recorded_at'])+timedelta(hours=1)),min_value=min(vals),max_value=max(vals),avg_value=round(sum(vals)/24,4),reading_count=24)
            if t=='dam_current_status':
                wl=rows['sensor_readings'][(i*6)*720+719]['reading_value']
                row.update(dam_id=ids['dams'][i],water_level_meters=wl,water_level_percentage=wl,storage_current_mcm=wl*5,storage_percentage=wl,full_reservoir_level_meters=100,danger_level_meters=95,hazard_status=['low','moderate','high','severe','critical'][i%5],current_hazard_level_id=ids['hazard_levels'][i%5],flood_risk_score=10+20*(i%5),total_gates_count=3,gates_open_count=1,last_updated=stamp(NOW),last_sensor_reading_at=stamp(NOW))
            if t=='dam_gates': row.update(dam_id=ids['dams'][i//3],gate_number=str(i%3+1))
            if t=='dam_hazard_zones':
                d=i//3; lat=7.05+d*.045-.02; lon=80.55+d*.032
                row.update(dam_id=ids['dams'][d],boundary_geojson=polygon(lat,lon,.005*(i%3+1)),center_latitude=lat,center_longitude=lon,fill_opacity=.35)
            if t=='alerts': row.update(simulation_mode=1,severity=['info','warning','critical','emergency'][i%4],title=f'[DEMO] Reservoir {i%10+1:02} safety exercise',message='Synthetic safety exercise. No real emergency or notification.')
            if t=='news_articles': row.update(source='DDAS Synthetic Demo',content='Synthetic training update for the local demonstration.',summary='Demo safety and reservoir monitoring update.',metadata={'synthetic':True},push_sent=0)
            if t=='admin_sessions': row['expires_at']=stamp(NOW-timedelta(days=1))
            if t=='report_status_history': row.update(new_status=rows['reports'][i%150]['status'],previous_status='pending')
            if t=='alert_escalations': row.update(previous_severity='warning',new_severity='critical')
            if t=='news_user_interactions': row.update(has_viewed=1,has_saved=0,has_shared=0)
            row={c['COLUMN_NAME']:row[c['COLUMN_NAME']] for c in schema[t]}
            rows[t].append(row)
    statements=['START TRANSACTION;']
    for t in order:
        data=rows[t]
        if not data: continue
        names=list(data[0])
        for offset in range(0,len(data),500):
            batch=data[offset:offset+500]
            statements.append(f'INSERT INTO `{t}` ('+','.join(f'`{n}`' for n in names)+') VALUES '+','.join('('+','.join(quote(r[n]) for n in names)+')' for r in batch)+';')
    coverage=[{'table':t,'inserted':counts[t],'ids':[starts[t],starts[t]+counts[t]-1] if counts[t] else []} for t in sorted(tables)]
    manifest={'seed':'ddas-demo-v2','generated_at':stamp(NOW),'created_tables':created,'tables':coverage,'total_inserted':sum(counts.values()),'phase':'base'}
    statements.append(manifest_statement(manifest))
    statements.append('COMMIT;')
    generated='\n'.join(statements)
    (OUT/'demo-seed.sql').write_text(generated,encoding='utf8')
    print(f'Inserting {sum(counts.values()):,} demo rows with foreign keys enabled.',flush=True)
    sql(generated)
    return manifest

def initialize_rbac():
    # Reuse the project's permission policy, without creating a default login.
    source=(ROOT/'DB SCHEMA/init_data.sql').read_text(encoding='utf8')
    source=source.split('-- 4. CREATE INITIAL ADMIN USER')[0]
    source=re.sub(r'--[^\n]*', '', source)
    statements=[]
    for statement in source.split(';'):
        if statement.strip().startswith('INSERT INTO'):
            table=re.search(r'INSERT INTO (\w+)',statement).group(1)
            statements.append(statement+f' ON DUPLICATE KEY UPDATE {table}.id={table}.id;')
    sql('START TRANSACTION;'+''.join(statements)+'COMMIT;')


def manifest_statement(manifest):
    return "INSERT INTO ddas_demo_seed_runs (seed_key,manifest) VALUES ('ddas-demo',"+quote(manifest)+") ON DUPLICATE KEY UPDATE manifest=VALUES(manifest);"


def save_manifest(manifest):
    sql(manifest_statement(manifest))
    (OUT/'seed-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')


def demo_where(table, alias=''):
    stored=records("SELECT manifest FROM ddas_demo_seed_runs WHERE seed_key='ddas-demo'")
    if not stored:
        raise RuntimeError('Run seed_demo.py before applying individual demo updates')
    manifest=json.loads(stored[0]['manifest'])
    span=next(e['ids'] for e in manifest['tables'] if e['table']==table)
    if not span:
        raise RuntimeError(f'No demo-owned IDs for {table}')
    prefix=alias+'.' if alias else ''
    return f'{prefix}id BETWEEN {int(span[0])} AND {int(span[1])}'


def seed_ui_fixtures(manifest):
    fixture=json.loads((ROOT/'scripts/fixtures/ui-demo-data.json').read_text(encoding='utf8'))
    sql('CREATE TABLE IF NOT EXISTS ddas_demo_ui_fixtures (fixture_key VARCHAR(100) PRIMARY KEY, source_path VARCHAR(255) NOT NULL, payload JSON NOT NULL) ENGINE=InnoDB')
    statements=['START TRANSACTION;']
    for dataset in fixture['datasets']:
        statements.append('INSERT INTO ddas_demo_ui_fixtures (fixture_key,source_path,payload) VALUES ('+
            ','.join(quote(v) for v in [dataset['key'],dataset['source'],dataset['records']])+
            ') ON DUPLICATE KEY UPDATE source_path=VALUES(source_path),payload=VALUES(payload);')
    statements.append('COMMIT;')
    sql(''.join(statements))
    manifest['ui_fixtures']={'datasets':len(fixture['datasets']),'records':sum(len(d['records']) for d in fixture['datasets']),'snapshot_date':fixture['snapshotDate']}


def validate(manifest):
    checks=[]
    for r in records('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL'):
        t,c,p,pc=(r[k] for k in ['TABLE_NAME','COLUMN_NAME','REFERENCED_TABLE_NAME','REFERENCED_COLUMN_NAME'])
        checks.append(f'SELECT {quote(t+"."+c)} relationship,COUNT(*) orphan_count FROM `{t}` ch LEFT JOIN `{p}` pa ON ch.`{c}`=pa.`{pc}` WHERE ch.`{c}` IS NOT NULL AND pa.`{pc}` IS NULL')
    result=records(' UNION ALL '.join(checks)) if checks else []
    if any(int(r['orphan_count']) for r in result):
        raise RuntimeError('Database contains orphan records')
    queries=[]
    for entry in manifest['tables']:
        t=entry['table']
        condition=f"id BETWEEN {entry['ids'][0]} AND {entry['ids'][1]}" if entry['ids'] else 'FALSE'
        queries.append(f'SELECT {quote(t)} tbl,COUNT(*) total,COALESCE(SUM({condition}),0) seeded FROM `{t}`')
    coverage={r['tbl']:r for r in records(' UNION ALL '.join(queries))}
    for entry in manifest['tables']:
        row=coverage[entry['table']]
        if entry['ids'] and int(row['seeded']) != entry['inserted']:
            raise RuntimeError(f"Seed records missing from {entry['table']}; refusing automatic repair")
        entry['total']=int(row['total'])
    dams=[e for e in manifest['tables'] if e['table']=='dams'][0]['ids']
    lo,hi=dams
    invalid=records(f'''SELECT COUNT(*) n FROM dam_current_status st JOIN dams d ON d.id=st.dam_id
        WHERE d.id BETWEEN {lo} AND {hi} AND (
        st.total_gates_count<>(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id)
        OR st.gates_open_count<>(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id AND g.current_opening_meters>0)
        OR NOT (st.water_level_meters<=>(SELECT CAST(sr.reading_value AS DECIMAL(8,2)) FROM sensor_readings sr
            JOIN sensors s ON s.id=sr.sensor_id JOIN sensor_types t ON t.id=s.sensor_type_id
            WHERE sr.dam_id=d.id AND t.code='WATER_LEVEL' ORDER BY sr.recorded_at DESC LIMIT 1)))''')
    if int(invalid[0]['n']):
        raise RuntimeError('Demo current status disagrees with gates or latest water readings')
    readings=next(e['ids'] for e in manifest['tables'] if e['table']=='sensor_readings')
    lo,hi=readings
    broken=records(f'SELECT COUNT(*) n FROM sensor_readings r JOIN sensors s ON s.id=r.sensor_id WHERE r.id BETWEEN {lo} AND {hi} AND (r.dam_id<>s.dam_id OR r.recorded_at>UTC_TIMESTAMP())')
    if int(broken[0]['n']):
        raise RuntimeError('Demo readings have mismatched dams or future timestamps')
    if manifest.get('ui_fixtures'):
        fixtures=records('SELECT fixture_key,payload FROM ddas_demo_ui_fixtures')
        expected=json.loads((ROOT/'scripts/fixtures/ui-demo-data.json').read_text(encoding='utf8'))['datasets']
        actual={r['fixture_key']:json.loads(r['payload']) for r in fixtures}
        if any(actual.get(d['key']) != d['records'] for d in expected):
            raise RuntimeError('Mobile demo fixture coverage is incomplete')
    manifest['validation']={'foreign_key_relationships_checked':len(result),'orphan_count':0,'current_status_consistent':True}


def main():
    parser=argparse.ArgumentParser(description='Seed the complete DDAS demo, including Victoria. Requires Docker Compose MySQL.')
    parser.add_argument('--validate-only',action='store_true',help='Check the database seed without inserting or updating records')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    from migrate_schema import migrate
    migrate(check_only=args.validate_only)
    present=records("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ddas_demo_seed_runs'")
    if args.validate_only and not present:
        raise RuntimeError('No database seed manifest; run the seed command first')
    if not present:
        sql('CREATE TABLE ddas_demo_seed_runs (seed_key VARCHAR(50) PRIMARY KEY, manifest JSON NOT NULL) ENGINE=InnoDB')
    stored=records("SELECT manifest FROM ddas_demo_seed_runs WHERE seed_key='ddas-demo'")
    manifest=json.loads(stored[0]['manifest']) if stored else None
    if manifest is None and not args.validate_only:
        if not (OUT/'before-demo.sql').exists():
            (OUT/'before-demo.sql').write_bytes(docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF $MYSQL_DATABASE'))
        # Adopt the previous local seed only when its ID ranges and user UUID match.
        legacy=ROOT/'local-data/seed-manifest.json'
        dam_table=records("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dams'")
        existing=records("SELECT id FROM dams WHERE code='DEMO-002'") if dam_table else []
        if existing:
            if not legacy.exists():
                raise RuntimeError('Legacy demo found without its manifest; refusing duplicate or guessed ownership')
            manifest=json.loads(legacy.read_text(encoding='utf8'))
            legacy_dams=next(e for e in manifest['tables'] if e['table']=='dams')['ids']
            if not legacy_dams or not legacy_dams[0] <= int(existing[0]['id']) <= legacy_dams[1]:
                raise RuntimeError('Existing DEMO-002 does not belong to this seed')
            expected=str(uuid.uuid5(NS,'users/1'))
            owned=records(f"SELECT id FROM users WHERE uuid={quote(expected)} AND email='demo001@example.invalid'")
            if not owned:
                raise RuntimeError('Legacy demo ownership could not be verified')
            validate(manifest)
            manifest['phase']='geography'
            save_manifest(manifest)
        else:
            manifest=seed_base()
    if manifest is None:
        raise RuntimeError('No completed seed exists')
    if not args.validate_only:
        if manifest['phase']=='base':
            finalize(manifest)
            manifest['phase']='geography'
            save_manifest(manifest)
        if manifest['phase']=='geography':
            from update_victoria_demo import main as victoria
            from update_victoria_zones import main as zones
            from update_victoria_points import main as points
            victoria(); zones(); points()
            manifest['phase']='complete'
        seed_ui_fixtures(manifest)
    validate(manifest)
    if not args.validate_only:
        save_manifest(manifest)
    print(json.dumps({'database':DATABASE,'phase':manifest['phase'],'demo_rows':manifest['total_inserted'],'ui_fixture_records':manifest.get('ui_fixtures',{}).get('records',0),'validation':manifest['validation']}))


if __name__=='__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        raise SystemExit('Demo seed failed: '+str(error))
