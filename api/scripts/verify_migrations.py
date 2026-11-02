"""Exercise schema drift and rejected conversions in a disposable seeded database.

Run: python api/scripts/verify_migrations.py --database ddas_seed_migrations_test
This intentionally changes test columns/constraints and restores them through
the migration runner. Never use it against an operational database.
"""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import shutil
import tempfile


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',required=True)
    args=parser.parse_args()
    if not args.database.startswith('ddas_seed_'):
        raise SystemExit('Use a disposable database whose name begins with ddas_seed_')
    os.environ['DDAS_SEED_DATABASE']=args.database
    import seed_demo as seed
    import migrate_schema as migration
    migration.migrate()
    before=seed.records('SELECT * FROM device_api_keys ORDER BY id')
    fk=seed.records("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='device_api_keys' AND COLUMN_NAME='sensor_id' AND REFERENCED_TABLE_NAME='sensors'")[0]['CONSTRAINT_NAME']
    seed.sql(f'ALTER TABLE device_api_keys DROP FOREIGN KEY `{fk}`; ALTER TABLE device_api_keys MODIFY sensor_id BIGINT UNSIGNED NOT NULL;')
    migration.migrate()
    assert before==seed.records('SELECT * FROM device_api_keys ORDER BY id')
    assert ('device_api_keys','sensor_id','sensors','id') in migration.existing_keys()[0]
    print('PASS: FK integer type and missing constraint repaired without changing records')
    sensors=seed.records('SELECT * FROM sensors ORDER BY id')
    seed.sql('ALTER TABLE sensors MODIFY sensor_uid VARCHAR(10) NOT NULL;')
    migration.migrate()
    assert sensors==seed.records('SELECT * FROM sensors ORDER BY id')
    assert migration.metadata()[('sensors','sensor_uid')]['COLUMN_TYPE']=='varchar(100)'
    print('PASS: older string width upgraded without changing sensor records')

    value=seed.records('SELECT operating_hours FROM system_safe_locations WHERE id=(SELECT MIN(id) FROM system_safe_locations)')[0]['operating_hours']
    seed.sql("ALTER TABLE system_safe_locations MODIFY operating_hours LONGTEXT NULL; UPDATE system_safe_locations SET operating_hours='invalid JSON' ORDER BY id LIMIT 1;")
    def digest():
        return hashlib.sha256(seed.docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF --compact --skip-add-locks $MYSQL_DATABASE')).digest()
    snapshot=digest()
    result=subprocess.run([sys.executable,str(Path(__file__).with_name('migrate_schema.py'))],cwd=seed.ROOT,capture_output=True,text=True)
    assert result.returncode!=0 and 'invalid JSON' in result.stderr+result.stdout
    assert digest()==snapshot, 'Rejected migration changed database contents'
    seed.sql('UPDATE system_safe_locations SET operating_hours='+seed.quote(None if value=='NULL' else value)+' ORDER BY id LIMIT 1;')
    migration.migrate()
    assert seed.records('SELECT operating_hours FROM system_safe_locations ORDER BY id LIMIT 1')[0]['operating_hours']==value
    print('PASS: invalid JSON conversion rejected without changes; corrected data migrates successfully')
    original=migration.MIGRATIONS
    snapshot=digest()
    try:
        with tempfile.TemporaryDirectory(prefix='ddas-migration-check-') as folder:
            target=Path(folder)
            for path in original.glob('V*__*'): shutil.copyfile(path,target/path.name)
            changed=target/'V002__entity_contract.json'
            changed.write_text(changed.read_text(encoding='utf8')+'\n',encoding='utf8')
            migration.MIGRATIONS=target
            try: migration.migrate()
            except RuntimeError as error:
                assert 'Applied migration was changed' in str(error)
            else: raise AssertionError('Changed migration was accepted')
    finally:
        migration.MIGRATIONS=original
    assert digest()==snapshot
    print('PASS: changed historical migration rejected without database changes')


if __name__=='__main__':
    main()
