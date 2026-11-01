"""Apply only V010's two user preference columns and their foreign key.

Other pre-existing schema drift is intentionally left to the general migrator.
Creates a full backup before DDL; never drops or rewrites existing records.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from migrate_schema import column_plan, key_plan, metadata
from seed_demo import OUT, dump_database, records, sql, quote

path = Path(__file__).with_name('migrations') / 'V010__mobile_onboarding_contract.json'
source = path.read_text(encoding='utf8')
checksum = hashlib.sha256(source.encode()).hexdigest()
history = records('SELECT checksum FROM ddas_schema_migrations WHERE version=' + quote(path.name))
if history and history[0]['checksum'] != checksum:
    raise SystemExit('Applied V010 migration checksum differs; inspect before continuing.')
full = json.loads(source)
columns = ('preferred_dam_id', 'onboarding_completed_at')
contract = {
    'tables': {'users': {name: full['tables']['users'][name] for name in columns}},
    'foreign_keys': [fk for fk in full['foreign_keys'] if fk['table'] == 'users' and fk['column'] == 'preferred_dam_id'],
    'unique_keys': [], 'indexes': [],
}
actions = column_plan(contract, metadata())
if actions:
    OUT.mkdir(parents=True, exist_ok=True)
    backup = OUT / ('before-mobile-onboarding-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f') + '.sql')
    backup.write_bytes(dump_database())
    sql('\n'.join(actions))
constraints = key_plan(contract)
if constraints:
    if not actions:
        OUT.mkdir(parents=True, exist_ok=True)
        backup = OUT / ('before-mobile-onboarding-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f') + '.sql')
        backup.write_bytes(dump_database())
    sql('\n'.join(constraints))
if column_plan(contract, metadata()) or key_plan(contract):
    raise SystemExit('Mobile schema verification failed')
sql('INSERT INTO ddas_schema_migrations(version,checksum) VALUES (' + quote(path.name) + ',' + quote(checksum) + ') ON DUPLICATE KEY UPDATE checksum=VALUES(checksum)')
print(json.dumps({'mobile_schema_valid': True, 'column_updates': len(actions), 'constraint_updates': len(constraints)}))
