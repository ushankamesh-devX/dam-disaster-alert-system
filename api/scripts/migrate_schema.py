"""Versioned, data-preserving MySQL schema setup, run before demo seeding.

Creates missing tables/columns and reconciles the checked-in JPA column contract.
Preflights data before tightening constraints or converting JSON/enums. Never drops
tables, columns or records. Ambiguous renames and unsafe conversions stop explicitly.
"""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from seed_demo import ROOT, OUT, DATABASE, docker, records, sql, quote
from schema_contract import entities

MIGRATIONS=Path(__file__).with_name('migrations')


def metadata():
    return {(r['TABLE_NAME'],r['COLUMN_NAME']):r for r in records(
        'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA '
        'FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()')}


def count(query):
    return int(records(query)[0]['n'])


def compatible_type(actual, desired):
    """Return a safe target type, or None when the existing type is sufficient."""
    actual=actual.lower(); desired=desired.lower()
    if actual==desired: return None
    base=lambda t:t.split('(')[0].split()[0]
    a,d=base(actual),base(desired)
    ranks={'tinyint':1,'smallint':2,'mediumint':3,'int':4,'bigint':5}
    if d=='boolean' and a in ['tinyint','bit','boolean']: return None
    if a in ranks and d in ranks:
        if ranks[a]>=ranks[d]: return None
        return desired+(' unsigned' if 'unsigned' in actual else '')
    if a==d=='varchar':
        return None if int(re.search(r'\d+',actual)[0])>=int(re.search(r'\d+',desired)[0]) else desired
    text={'tinytext':255,'text':65535,'mediumtext':16777215,'longtext':4294967295}
    if d=='varchar' and a in text: return None
    if a in text and d in text: return None if text[a]>=text[d] else desired
    if d in text and a in ['char','varchar','enum','set']: return desired
    if d=='varchar' and a in ['char','enum','set']:
        values=re.findall(r"'([^']*)'",actual)
        length=sum(map(len,values))+max(0,len(values)-1) if a=='set' else max(map(len,values),default=0)
        if a=='char': length=int(re.search(r'\d+',actual)[0])
        desired_length=int(re.search(r'\d+',desired)[0])
        return f'varchar({max(length,desired_length)})'
    if a==d=='decimal':
        p,s=map(int,re.findall(r'\d+',actual)); dp,ds=map(int,re.findall(r'\d+',desired))
        if p-s>=dp-ds and s>=ds: return None
        scale=max(s,ds); precision=max(p-s,dp-ds)+scale
        return f'decimal({precision},{scale})'
    if a in ['timestamp','datetime'] and d=='datetime': return None
    if a==d=='date' or a==d=='year': return None
    if a=='float' and d=='double': return 'double'
    if a==d=='enum':
        av=re.findall(r"'([^']*)'",actual); dv=re.findall(r"'([^']*)'",desired)
        return None if set(av)==set(dv) else desired
    if d=='enum' and a in ['varchar','char']: return desired
    if d=='json' and a in ['varchar','text','mediumtext','longtext']: return desired
    raise RuntimeError(f'Unsafe or unsupported type conversion {actual} -> {desired}; add an explicit migration')


def existing_keys():
    fks={(r['TABLE_NAME'],r['COLUMN_NAME'],r['REFERENCED_TABLE_NAME'],r['REFERENCED_COLUMN_NAME'])
        for r in records('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')}
    unique={}
    for r in records('SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND NON_UNIQUE=0 ORDER BY SEQ_IN_INDEX'):
        unique.setdefault((r['TABLE_NAME'],r['INDEX_NAME']),[]).append(r['COLUMN_NAME'])
    return fks,unique


def definition(dtype, nullable, default=None, extra=''):
    if default=='NULL': default=None
    output=dtype+(' NULL' if nullable else ' NOT NULL')
    if default is not None:
        if re.fullmatch(r'current_timestamp(?:\(\d*\))?',str(default),re.I): output+=' DEFAULT '+str(default)
        else: output+=' DEFAULT '+quote(default)
    if 'auto_increment' in extra.lower(): output+=' AUTO_INCREMENT'
    update=re.search(r'on update (current_timestamp(?:\(\d*\))?)',extra,re.I)
    if update: output+=' ON UPDATE '+update[1]
    return output


def column_plan(contract, columns):
    actions=[]; errors=[]
    fks,_=existing_keys()
    related={(t,c) for t,c,_,_ in fks}|{(p,pc) for _,_,p,pc in fks}
    for table,specs in contract['tables'].items():
        for col,spec in specs.items():
            key=(table,col); old=columns.get(key); dtype=spec['type']
            if not old:
                if spec.get('optional'): continue
                if spec.get('references'):
                    parent=columns.get(tuple(spec['references']))
                    if parent: dtype=parent['COLUMN_TYPE']
                default=spec.get('default_sql')
                if not spec['nullable'] and default is None and count(f'SELECT COUNT(*) n FROM `{table}`'):
                    errors.append(f'{table}.{col}: missing required column on a populated table; explicit backfill/rename migration required')
                    continue
                clause=dtype+(' NULL' if spec['nullable'] else ' NOT NULL')
                if default is not None: clause+=' DEFAULT '+default
                if spec.get('primary'): clause+=' AUTO_INCREMENT PRIMARY KEY'
                actions.append(f'ALTER TABLE `{table}` ADD COLUMN `{col}` {clause};')
                continue
            try: target=compatible_type(old['COLUMN_TYPE'],dtype)
            except RuntimeError as error:
                errors.append(f'{table}.{col}: {error}'); continue
            tighten=not spec['nullable'] and old['IS_NULLABLE']=='YES'
            loosen=spec['nullable'] and old['IS_NULLABLE']=='NO'
            if not target and not tighten and not loosen: continue
            if target and key in related:
                errors.append(f'{table}.{col}: type change affects foreign keys; explicit coordinated migration required'); continue
            if tighten and count(f'SELECT COUNT(*) n FROM `{table}` WHERE `{col}` IS NULL'):
                errors.append(f'{table}.{col}: NULL values prevent NOT NULL; explicit backfill required'); continue
            if target and target.startswith('enum('):
                if count(f'SELECT COUNT(*) n FROM `{table}` WHERE `{col}` IS NOT NULL AND `{col}` NOT IN ({target[5:-1]})'):
                    errors.append(f'{table}.{col}: values are outside the current Java enum; explicit value mapping required'); continue
                if old['COLUMN_DEFAULT'] not in [None,'NULL'] and old['COLUMN_DEFAULT'] not in re.findall(r"'([^']*)'",target):
                    errors.append(f'{table}.{col}: old default is outside the new enum'); continue
            if target=='json' and count(f'SELECT COUNT(*) n FROM `{table}` WHERE `{col}` IS NOT NULL AND JSON_VALID(`{col}`)=0'):
                errors.append(f'{table}.{col}: invalid JSON; fix those records before migration'); continue
            nullable=spec['nullable']
            default=old['COLUMN_DEFAULT']
            if default=='NULL': default=None
            actions.append(f'ALTER TABLE `{table}` MODIFY COLUMN `{col}` '+definition(target or old['COLUMN_TYPE'],nullable,default,old['EXTRA'])+';')
    if errors: raise RuntimeError('Schema migration preflight failed:\n'+'\n'.join(errors))
    return actions


def key_plan(contract):
    actions=[]; errors=[]
    fks,unique=existing_keys()
    columns=metadata()
    for key in contract['unique_keys']:
        table,cols=key['table'],key['columns']
        if any((table,c) not in columns and contract['tables'][table][c].get('optional') for c in cols): continue
        if any(t==table and names==cols and (not key.get('primary') or name=='PRIMARY') for (t,name),names in unique.items()): continue
        if key.get('primary') and (table,'PRIMARY') in unique:
            errors.append(f'{table}: existing primary key differs; explicit coordinated migration required'); continue
        names=','.join(f'`{c}`' for c in cols)
        nonnull=' AND '.join(f'`{c}` IS NOT NULL' for c in cols)
        if count(f'SELECT COUNT(*) n FROM (SELECT {names} FROM `{table}` WHERE {nonnull} GROUP BY {names} HAVING COUNT(*)>1) duplicates'):
            errors.append(f'{table}({names}): duplicate values prevent unique constraint'); continue
        name='ddas_uq_'+hashlib.sha256((table+names).encode()).hexdigest()[:12]
        clause=f'PRIMARY KEY ({names})' if key.get('primary') else f'UNIQUE KEY `{name}` ({names})'
        actions.append(f'ALTER TABLE `{table}` ADD {clause};')
    for fk in contract['foreign_keys']:
        t,c,p,pc=(fk[k] for k in ['table','column','parent','parent_column'])
        if (t,c,p,pc) in fks: continue
        if columns[(t,c)]['COLUMN_TYPE']!=columns[(p,pc)]['COLUMN_TYPE']:
            old=columns[(t,c)]; desired=columns[(p,pc)]['COLUMN_TYPE']
            bound=any((t,c)==(ct,cc) or (t,c)==(pt,pp) for ct,cc,pt,pp in fks)
            integer=lambda value:bool(re.fullmatch(r'(?:bigint|int)(?:\(\d+\))?(?: unsigned)?',value))
            if not bound and integer(old['COLUMN_TYPE']) and integer(desired):
                limit=9223372036854775807 if desired.startswith('bigint') else 2147483647
                lower=0 if 'unsigned' in desired else -limit-1
                if 'unsigned' in desired: limit=2*limit+1
                if count(f'SELECT COUNT(*) n FROM `{t}` WHERE `{c}`<{lower} OR `{c}`>{limit}'):
                    errors.append(f'{t}.{c}: values do not fit the parent integer type'); continue
                actions.append(f'ALTER TABLE `{t}` MODIFY COLUMN `{c}` '+definition(desired,old['IS_NULLABLE']=='YES',old['COLUMN_DEFAULT'],old['EXTRA'])+';')
            else:
                errors.append(f'{t}.{c}: type does not match {p}.{pc}; coordinated FK migration required'); continue
        if count(f'SELECT COUNT(*) n FROM `{t}` ch LEFT JOIN `{p}` pa ON ch.`{c}`=pa.`{pc}` WHERE ch.`{c}` IS NOT NULL AND pa.`{pc}` IS NULL'):
            errors.append(f'{t}.{c}: orphan records prevent foreign key'); continue
        name='ddas_fk_'+hashlib.sha256((t+c+p+pc).encode()).hexdigest()[:12]
        actions.append(f'ALTER TABLE `{t}` ADD CONSTRAINT `{name}` FOREIGN KEY (`{c}`) REFERENCES `{p}` (`{pc}`) ON DELETE {fk["delete"]};')
    if errors: raise RuntimeError('Constraint migration preflight failed:\n'+'\n'.join(errors))
    return actions


def migrate(check_only=False):
    files=sorted(MIGRATIONS.glob('V*__*'))
    contents={p.name:p.read_text(encoding='utf8') for p in files}
    # Normalize line endings so the same migration has the same checksum on
    # Windows and Linux. Accept the raw Windows checksums from initial local runs.
    versions={name:hashlib.sha256(text.encode('utf8')).hexdigest() for name,text in contents.items()}
    windows_checksums={name:hashlib.sha256(text.replace('\n','\r\n').encode('utf8')).hexdigest() for name,text in contents.items()}
    tables={r['TABLE_NAME'] for r in records('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')}
    history=records('SELECT version,checksum FROM ddas_schema_migrations') if 'ddas_schema_migrations' in tables else []
    applied={r['version'] for r in history}
    for row in history:
        if row['checksum'] not in [versions.get(row['version']),windows_checksums.get(row['version'])]:
            raise RuntimeError('Applied migration was changed or removed: '+row['version'])
    contract=json.loads([p for p in files if p.suffix=='.json'][-1].read_text(encoding='utf8'))
    if contract['entities']!=entities():
        raise RuntimeError('Java entities changed after the latest schema contract; add a new versioned contract migration')
    ddl=(MIGRATIONS/'V001__base_schema.sql').read_text(encoding='utf8')
    missing=[(m[1],m[0]) for m in re.finditer(r'CREATE TABLE IF NOT EXISTS (\w+)\s*\(.*?ENGINE=InnoDB[^;]*;',ddl,re.S) if m[1] not in tables]
    if check_only and missing:
        raise RuntimeError('Schema updates required: missing tables '+', '.join(t for t,_ in missing))
    backup_done=False
    def execute(actions):
        nonlocal backup_done
        if not actions: return
        if check_only: raise RuntimeError('Schema updates required:\n'+'\n'.join(actions))
        if not backup_done:
            OUT.mkdir(parents=True,exist_ok=True)
            backup=OUT/('before-schema-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')+'.sql')
            backup.write_bytes(docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF $MYSQL_DATABASE'))
            backup_done=True
        sql("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';\n"+'\n'.join(actions))
    # Adapt each missing table's FK integer types to already-existing parent IDs.
    cols=metadata()
    for table,statement in missing:
        for col,parent,pcol in re.findall(r'FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\((\w+)\)',statement):
            actual=cols.get((parent,pcol))
            if actual:
                statement=re.sub(r'(?m)^(\s*'+re.escape(col)+r'\s+)(?:BIGINT|INT)\b(?:\s+UNSIGNED)?',lambda m:m[1]+actual['COLUMN_TYPE'],statement,flags=re.I)
        execute([statement])
        # New baseline table IDs are signed BIGINTs; avoids a round trip per table.
        cols[(table,'id')]={'COLUMN_TYPE':'bigint'}
    for path in files:
        if path.suffix=='.sql' and path.name!='V001__base_schema.sql' and path.name not in applied:
            if check_only: raise RuntimeError('Pending SQL migration: '+path.name)
            execute([path.read_text(encoding='utf8')])
    changes=column_plan(contract,metadata())
    execute(changes)
    constraints=key_plan(contract)
    execute(constraints)
    if not check_only:
        sql('CREATE TABLE IF NOT EXISTS ddas_schema_migrations (version VARCHAR(150) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB')
        for version,checksum in versions.items():
            sql('INSERT INTO ddas_schema_migrations(version,checksum) VALUES ('+quote(version)+','+quote(checksum)+') ON DUPLICATE KEY UPDATE checksum=VALUES(checksum)')
    print(json.dumps({'database':DATABASE,'schema_versions':len(versions),'created_tables':len(missing),'column_updates':len(changes),'constraint_updates':len(constraints),'schema_valid':True}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Read-only schema compatibility check')
    args=parser.parse_args()
    try: migrate(args.check)
    except (RuntimeError,OSError,ValueError) as error: raise SystemExit(str(error))
