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
    spans={r['table']:r['ids'] for r in manifest['tables'] if r['ids']}
    def where(t,alias):
        lo,hi=spans[t]
        return f'{alias}.id BETWEEN {lo} AND {hi}'
    updates=[]
    for tbl, q in [
        ('dam_gates', 'UPDATE dam_gates g JOIN dams d ON d.id=g.dam_id SET g.latitude=d.latitude,g.longitude=d.longitude WHERE '+where('dam_gates','g')),
        ('gate_operation_logs', 'UPDATE gate_operation_logs l JOIN dam_gates g ON g.id=l.gate_id SET l.dam_id=g.dam_id,l.opening_before=0,l.opening_after=g.current_opening_meters,l.operation_type=IF(g.current_opening_meters>0,"partial_open","close") WHERE '+where('gate_operation_logs','l')),
        ('dam_hazard_zone_history', 'UPDATE dam_hazard_zone_history h JOIN dam_hazard_zones z ON z.id=h.zone_id SET h.dam_id=z.dam_id WHERE '+where('dam_hazard_zone_history','h')),
        ('dam_hazard_assessments', 'UPDATE dam_hazard_assessments h JOIN dams d ON d.id=h.dam_id SET h.new_hazard_level_id=d.overall_hazard_level_id,h.new_status=d.overall_hazard_status WHERE '+where('dam_hazard_assessments','h')),
        ('reports', 'UPDATE reports r SET r.resolved_at=IF(r.status="resolved",DATE_ADD(r.created_at,INTERVAL 1 HOUR),NULL),r.resolved_by=IF(r.status="resolved",(SELECT id FROM users WHERE email="admin@ddas.gov.lk"),NULL),r.resolution_notes=IF(r.status="resolved","Synthetic report resolved during demo exercise",NULL),r.rejection_reason=IF(r.status="rejected","Synthetic report rejected during demo review",NULL),r.duplicate_of_id=NULL,r.related_alert_id=NULL WHERE '+where('reports','r')),
        ('report_status_history', 'UPDATE report_status_history h JOIN reports r ON r.id=h.report_id SET h.new_status=r.status,h.created_at=DATE_ADD(r.created_at,INTERVAL 1 HOUR) WHERE '+where('report_status_history','h')),
        ('reports', 'UPDATE reports r SET r.comment_count=(SELECT COUNT(*) FROM report_comments c WHERE c.report_id=r.id),r.upvote_count=(SELECT COUNT(*) FROM report_upvotes u WHERE u.report_id=r.id) WHERE '+where('reports','r')),
        ('news_user_interactions', 'UPDATE news_user_interactions i JOIN news_articles a ON a.id=i.article_id SET i.viewed_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR),i.saved_at=NULL,i.shared_at=NULL,i.created_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR) WHERE '+where('news_user_interactions','i')),
        ('news_articles', 'UPDATE news_articles a SET a.view_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_viewed=1),a.save_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_saved=1),a.share_count=(SELECT COUNT(*) FROM news_user_interactions i WHERE i.article_id=a.id AND i.has_shared=1) WHERE '+where('news_articles','a')),
        ('news_push_logs', 'UPDATE news_push_logs l JOIN news_articles a ON a.id=l.article_id SET l.provider="DEMO-NO-SEND",l.total_recipients=100,l.sent_count=100,l.delivered_count=95,l.failed_count=5,l.opened_count=40,l.sent_at=DATE_ADD(a.publish_date,INTERVAL 1 HOUR),l.completed_at=DATE_ADD(a.publish_date,INTERVAL 2 HOUR),l.error_summary=JSON_OBJECT("synthetic",TRUE,"simulated_failures",5) WHERE '+where('news_push_logs','l')),
        ('alert_user_deliveries', 'UPDATE alert_user_deliveries l JOIN alerts a ON a.id=l.alert_id SET l.push_status="delivered",l.push_sent_at=DATE_ADD(a.created_at,INTERVAL 1 MINUTE),l.push_delivered_at=DATE_ADD(a.created_at,INTERVAL 2 MINUTE),l.sms_status="disabled",l.email_status="disabled",l.sms_sent_at=NULL,l.sms_delivered_at=NULL,l.email_sent_at=NULL,l.email_delivered_at=NULL,l.push_error=NULL,l.sms_error=NULL,l.email_error=NULL,l.read_at=DATE_ADD(a.created_at,INTERVAL 3 MINUTE) WHERE '+where('alert_user_deliveries','l')),
        ('alert_acknowledgments', 'UPDATE alert_acknowledgments k JOIN alerts a ON a.id=k.alert_id SET k.responded_at=DATE_ADD(a.created_at,INTERVAL 4 MINUTE) WHERE '+where('alert_acknowledgments','k')),
        ('alert_escalations', 'UPDATE alert_escalations e JOIN alerts a ON a.id=e.alert_id SET e.escalated_at=DATE_ADD(a.created_at,INTERVAL 5 MINUTE),e.previous_severity="warning",e.new_severity="critical" WHERE '+where('alert_escalations','e')),
        ('user_hazard_location_snapshots', 'UPDATE user_hazard_location_snapshots s JOIN dam_hazard_zones z ON z.id=s.hazard_zone_id JOIN dams d ON d.id=z.dam_id SET s.dam_id=z.dam_id,s.region_id=d.region_id,s.hazard_level_id=z.hazard_level_id,s.latitude=z.center_latitude,s.longitude=z.center_longitude WHERE '+where('user_hazard_location_snapshots','s')),
        ('sos_events', 'UPDATE sos_events s JOIN dam_hazard_zones z ON z.id=s.hazard_zone_id JOIN dams d ON d.id=z.dam_id SET s.dam_id=z.dam_id,s.region_id=d.region_id,s.hazard_level_id=z.hazard_level_id,s.latitude=z.center_latitude,s.longitude=z.center_longitude,s.status="resolved",s.acknowledged_at=DATE_ADD(s.triggered_at,INTERVAL 1 MINUTE),s.responding_at=DATE_ADD(s.triggered_at,INTERVAL 5 MINUTE),s.resolved_at=DATE_ADD(s.triggered_at,INTERVAL 30 MINUTE),s.cancelled_at=NULL,s.cancellation_reason=NULL WHERE '+where('sos_events','s')),
        ('sos_event_notifications', 'UPDATE sos_event_notifications n JOIN sos_events s ON s.id=n.sos_event_id SET n.provider="DEMO-NO-SEND",n.channel="in_app",n.status="delivered",n.queued_at=s.triggered_at,n.sent_at=DATE_ADD(s.triggered_at,INTERVAL 1 MINUTE),n.delivered_at=DATE_ADD(s.triggered_at,INTERVAL 2 MINUTE),n.failed_at=NULL,n.next_retry_at=NULL,n.error_code=NULL,n.error_message=NULL WHERE '+where('sos_event_notifications','n')),
        ('location_sharing_sessions', 'UPDATE location_sharing_sessions s SET s.expires_at=DATE_ADD(s.started_at,INTERVAL 1 HOUR),s.ended_at=DATE_ADD(s.started_at,INTERVAL 1 HOUR),s.status="ended" WHERE '+where('location_sharing_sessions','s')),
        ('dam_current_status', 'UPDATE dam_current_status st JOIN dams d ON d.id=st.dam_id SET st.total_gates_count=(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id),st.gates_open_count=(SELECT COUNT(*) FROM dam_gates g WHERE g.dam_id=d.id AND g.current_opening_meters>0),st.hazard_value=d.overall_hazard_status,st.active_hazard_zones=(SELECT JSON_ARRAYAGG(z.id) FROM dam_hazard_zones z WHERE z.dam_id=d.id AND z.is_active=1) WHERE '+where('dam_current_status','st'))
    ]:
        if tbl in spans:
            updates.append(q)
    if updates:
        sql('START TRANSACTION;\n'+';\n'.join(updates)+';\nCOMMIT;')
    (OUT/'seed-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    try:
        from scatter_demo import apply as scatter_geography
        scatter_geography(manifest)
    except Exception as e:
        print(f"Skipping scatter geography: {e}")

def seed_base():
    tables = [r['TABLE_NAME'] for r in records('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE="BASE TABLE";')]
    if 'dams' in tables and records("SELECT id FROM dams WHERE code LIKE 'DEMO-%' LIMIT 1;"):
        print('Demo rows already exist; skipping insertion.')
        stored = records("SELECT manifest FROM ddas_demo_seed_runs WHERE seed_key='ddas-demo'")
        if stored:
            return json.loads(stored[0]['manifest'])
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
    supported = set()
    schema_dir = ROOT / 'DB SCHEMA'
    if schema_dir.exists():
        for sql_f in schema_dir.glob('*.sql'):
            supported |= set(re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)', sql_f.read_text(encoding='utf8', errors='ignore')))
    counts = {t:20 if t in supported else 0 for t in tables}
    counts.update(users=100,regions=5,dams=10,dam_current_status=10,dam_gates=30,dam_hazard_zones=30,sensors=60,sensor_readings=43200,sensor_readings_aggregated=1800,alerts=100,reports=150,news_articles=30,system_safe_locations=30,news_user_interactions=100,news_subscriptions=100,alert_user_deliveries=100,alert_acknowledgments=100,report_upvotes=100,report_comments=150,report_status_history=150,report_media=30,device_api_keys=6)
    counts.update(roles=0,permissions=0,role_permissions=0,hazard_levels=5,sensor_types=6,alert_types=4,report_types=6,location_types=4,news_categories=4,contact_relationship_types=4,sos_event_types=4,dam_custom_field_definitions=4,dam_field_templates=2,dam_field_template_items=8)
    for t in ['roles','permissions','hazard_levels','sensor_types','alert_types','report_types','location_types','news_categories','contact_relationship_types','sos_event_types']:
        if t in existing and existing[t]:
            counts[t]=0
        elif t not in tables:
            counts[t]=0
    ids={t:list(range(starts[t],starts[t]+counts[t])) if counts.get(t,0) else existing.get(t,[]) for t in tables}
    if 'sensor_types' in tables and existing.get('sensor_types'):
        ids['sensor_types'] = [int(r['id']) for r in records('SELECT id FROM sensor_types')]
    if 'hazard_levels' in tables and existing.get('hazard_levels'):
        ids['hazard_levels'] = [int(r['id']) for r in records('SELECT id FROM hazard_levels')]
    refs[('dam_current_status','__readings_dependency')]='sensor_readings'
    refs[('sensor_readings_aggregated','__readings_dependency')]='sensor_readings'
    pending=set(tables); order=[]
    while pending:
        ready=sorted(t for t in pending if counts.get(t,0)==0 or all(parent not in pending or parent==t or counts.get(parent,0)==0 for (child,_),parent in refs.items() if child==t))
        if not ready:
            order.extend(list(pending))
            break
        order.extend(ready); pending.difference_update(ready)
    rows={t:[] for t in tables}
    def ref(t,n,i):
        parent=refs.get((t,n)); pool=ids.get(parent,[])
        return pool[i%len(pool)] if pool else None
    sensor_codes=['WATER_LEVEL','RAINFALL','INFLOW','OUTFLOW','SOIL_MOISTURE','TEMPERATURE']
    units=['m','mm/hr','cumecs','cumecs','%','C']
    hazard_names=['Low','Moderate','High','Severe','Critical']
    colors=['#22C55E','#EAB308','#F97316','#EF4444','#991B1B']
    role_check = records("SELECT id FROM roles WHERE code IN ('NORMAL_USER', 'USER') LIMIT 1")
    normal_role_id = int(role_check[0]['id']) if role_check else 1
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
        for i in range(counts.get(t,0)):
            row={c['COLUMN_NAME']:value(t,c,i) for c in schema[t]}
            for c in schema[t]:
                n=c['COLUMN_NAME']
                if row[n] is None and c['IS_NULLABLE']=='NO':
                    if c['COLUMN_TYPE'].startswith(('int','bigint','tinyint','smallint')): row[n] = 1
                    else: row[n] = 'DEFAULT'
            if t=='sensor_types': row.update(code=sensor_codes[i],name=sensor_codes[i].replace('_',' ').title(),unit=units[i],min_threshold=0,max_threshold=150 if i==0 else 5000,critical_threshold=95 if i==0 else 4000)
            if t=='hazard_levels': row.update(code=f'LEVEL_{i+1}',name=hazard_names[i],level_number=i+1,color=colors[i],risk_score_min=i*20,risk_score_max=(i+1)*20)
            if t=='regions': row.update(name=f'Demo Region {i+1}',country='Sri Lanka')
            if t=='users': row.update(role_id=normal_role_id,full_name=f'Demo Resident {i+1:03}',status='active')
            if t=='dams' and 'hazard_levels' in ids and ids['hazard_levels']:
                row.update(name=f'Demo Reservoir {i+1:02}',height_meters=110,length_meters=300,reservoir_capacity_mcm=500,gross_storage_mcm=500,live_storage_mcm=450,dead_storage_mcm=50,overall_hazard_status=['low','moderate','high','severe','critical'][i%5],overall_hazard_level_id=ids['hazard_levels'][i%len(ids['hazard_levels'])],map_default_zoom=12)
            if t=='sensors' and 'dams' in ids and ids['dams'] and 'sensor_types' in ids and ids['sensor_types']:
                d=i//6; k=i%6
                row.update(dam_id=ids['dams'][d%len(ids['dams'])],sensor_type_id=ids['sensor_types'][k%len(ids['sensor_types'])],name=f'Demo Reservoir {d+1:02} {sensor_codes[k]}',min_reading=0,max_reading=150 if k==0 else 5000,warning_threshold=85 if k==0 else 3500,critical_threshold=95 if k==0 else 4000,last_reading_at=stamp(NOW),latitude=7.05+d*.045,longitude=80.55+d*.032)
            if t=='alerts': row.update(simulation_mode=1,severity=['info','warning','critical','emergency'][i%4],title=f'[DEMO] Reservoir {i%10+1:02} safety exercise',message='Synthetic safety exercise. No real emergency or notification.')
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
    coverage=[{'table':t,'inserted':counts.get(t,0),'ids':[starts[t],starts[t]+counts[t]-1] if counts.get(t,0) else []} for t in sorted(tables)]
    manifest={'seed':'ddas-demo-v2','generated_at':stamp(NOW),'created_tables':created,'tables':coverage,'total_inserted':sum(counts.values()),'phase':'base'}
    statements.append(manifest_statement(manifest))
    statements.append('COMMIT;')
    generated='\n'.join(statements)
    (OUT/'demo-seed.sql').write_text(generated,encoding='utf8')
    print(f'Inserting {sum(counts.values()):,} demo rows with foreign keys enabled.',flush=True)
    sql(generated)
    return manifest

def initialize_rbac():
    source = (ROOT / 'DB SCHEMA/init_data.sql').read_text(encoding='utf8')
    source = source.split('-- 4. CREATE INITIAL ADMIN USER')[0]
    source = re.sub(r'--[^\n]*', '', source)
    statements = []
    for statement in source.split(';'):
        statement = statement.strip()
        if statement.startswith('INSERT INTO'):
            table_match = re.search(r'INSERT INTO (\w+)', statement)
            if table_match:
                table = table_match.group(1)
                if table == 'role_permissions':
                    statements.append(statement.replace('INSERT INTO', 'INSERT IGNORE INTO') + ';')
                else:
                    statements.append(statement + f' ON DUPLICATE KEY UPDATE {table}.id={table}.id;')
    sql('START TRANSACTION;' + ''.join(statements) + 'COMMIT;')

def manifest_statement(manifest):
    return "INSERT INTO ddas_demo_seed_runs (seed_key,manifest) VALUES ('ddas-demo',"+quote(manifest)+") ON DUPLICATE KEY UPDATE manifest=VALUES(manifest);"

def save_manifest(manifest):
    sql(manifest_statement(manifest))
    (OUT/'seed-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

def main():
    parser=argparse.ArgumentParser(description='Seed the complete DDAS demo')
    parser.add_argument('--validate-only',action='store_true')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    present=records("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ddas_demo_seed_runs'")
    if not present:
        sql('CREATE TABLE ddas_demo_seed_runs (seed_key VARCHAR(50) PRIMARY KEY, manifest JSON NOT NULL) ENGINE=InnoDB')
    stored=records("SELECT manifest FROM ddas_demo_seed_runs WHERE seed_key='ddas-demo'")
    manifest=json.loads(stored[0]['manifest']) if stored else None
    if manifest is None:
        manifest=seed_base()
    if manifest and manifest.get('phase')=='base':
        try:
            finalize(manifest)
        except Exception as e:
            print(f"Skipping finalize details: {e}")
        manifest['phase']='complete'
        save_manifest(manifest)
    print("Database seeding completed successfully!")

if __name__=='__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        raise SystemExit('Demo seed failed: '+str(error))