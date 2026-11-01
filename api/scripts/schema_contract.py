"""Build the checked-in column contract from the project's explicit JPA mappings."""
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def snake(name):
    return re.sub(r'(?<!^)(?=[A-Z])','_',name).lower()


def entities():
    sources={p.stem:re.sub(r'/\*.*?\*/|//[^\n]*','',p.read_text(encoding='utf8'),flags=re.S)
        for p in (ROOT/'src/main/java/com/ddas/api/entity').glob('*.java')}
    tables={name:re.search(r'@Table\(name\s*=\s*"([^"]+)"',s).group(1) for name,s in sources.items()}
    enums={}
    for name,source in sources.items():
        for match in re.finditer(r'public enum (\w+)\s*\{([^}]+)\}',source):
            enums[name+'.'+match[1]]=re.findall(r'\b\w+\b',match[2])
    result={}
    for name,source in sources.items():
        columns={}
        for match in re.finditer(r'((?:\s*@[\w.]+(?:\([^\n]*\))?\s*)*)private\s+([\w.<>]+)\s+(\w+)\s*(?:=\s*([^;]+))?;',source):
            annotation,kind,field,initial=match.groups()
            if '<' in kind or '@Transient' in annotation: continue
            column=re.search(r'@(Column|JoinColumn)\(([^\n]*)\)',annotation)
            options=column[2] if column else ''
            explicit=re.search(r'name\s*=\s*"([^"]+)"',options)
            col=explicit[1] if explicit else snake(field)
            definition=re.search(r'columnDefinition\s*=\s*"([^"]+)"',options)
            length=re.search(r'length\s*=\s*(\d+)',options)
            precision=re.search(r'precision\s*=\s*(\d+)',options)
            scale=re.search(r'scale\s*=\s*(\d+)',options)
            enum_key=kind if '.' in kind else name+'.'+kind
            if definition:
                dtype=definition[1].split(' DEFAULT ')[0].lower()
            elif enum_key in enums:
                dtype='enum('+','.join("'"+v+"'" for v in enums[enum_key])+')'
            elif kind in tables: dtype='bigint'
            elif kind=='String': dtype=f'varchar({length[1] if length else 255})'
            elif kind=='BigDecimal': dtype=f'decimal({precision[1] if precision else 38},{scale[1] if scale else 2})'
            else:
                dtype={'Long':'bigint','Integer':'int','Boolean':'boolean','boolean':'boolean',
                    'Double':'double','Float':'float','LocalDateTime':'datetime(6)',
                    'LocalDate':'date','Year':'year'}.get(kind)
            if dtype is None: raise ValueError(f'Unsupported entity field {name}.{field}: {kind}')
            spec={'type':dtype,'nullable':'nullable = false' not in options and '@Id' not in annotation,
                'unique':'unique = true' in options,'primary':'@Id' in annotation}
            if kind in tables: spec['references']=[tables[kind],'id']
            default=re.search(r'DEFAULT\s+(.*)',definition[1],re.I) if definition else None
            if default: spec['default_sql']=default[1]
            elif initial in ['true','false'] or (initial and re.fullmatch(r'\d+',initial)):
                spec['default_sql']=initial.upper()
            columns[col]=spec
        result[tables[name]]=columns
    return dict(sorted(result.items()))


def base_tables():
    sources=['DB SCHEMA/ddas_complete_schema.sql','DB SCHEMA/ddas_news_schema.sql',
        'DB SCHEMA/migrations/add_device_api_keys.sql','scripts/fixtures/extra-schema.sql']
    result=[]
    for path in sources:
        source=(ROOT/path).read_text(encoding='utf8')
        for match in re.finditer(r'CREATE TABLE IF NOT EXISTS (\w+)\s*\(.*?ENGINE=InnoDB[^;]*;',source,re.S):
            result.append((match[1],re.sub(r'\bUNSIGNED\b','',match[0])))
    return result


def contract():
    result={}
    foreign=[]; unique=[]
    for table,ddl in base_tables():
        columns={}
        body=re.sub(r'--[^\n]*','',ddl[ddl.index('(')+1:ddl.rindex(') ENGINE')])
        parts=[]; start=0; depth=0; quoted=False
        for i,char in enumerate(body):
            if char=="'" and (i==0 or body[i-1]!='\\'): quoted=not quoted
            if not quoted:
                if char=='(': depth+=1
                elif char==')': depth-=1
                elif char==',' and depth==0:
                    parts.append(body[start:i]); start=i+1
        parts.append(body[start:])
        for line in parts:
            match=re.match(r'\s*(\w+)\s+((?:ENUM|SET)\s*\([^)]*\)|\w+(?:\([^)]*\))?)(.*)',line,re.I|re.S)
            if not match or match[1].upper() in ['PRIMARY','INDEX','UNIQUE','FOREIGN','CONSTRAINT','KEY','FULLTEXT']: continue
            col,dtype,rest=match.groups()
            dtype=re.sub(r'\s+','',dtype)
            rest=rest.split('COMMENT')[0]
            if dtype.upper() not in ['ENGINE'] and not line.lstrip().startswith(')'):
                spec={'type':dtype.lower(),'nullable':'NOT NULL' not in rest.upper() and 'PRIMARY KEY' not in rest.upper(),
                    'unique':'UNIQUE' in rest.upper(),'primary':'PRIMARY KEY' in rest.upper()}
                default=re.search(r"DEFAULT\s+('[^']*'|[\w().]+)",rest,re.I)
                if default: spec['default_sql']=default[1]
                columns[col]=spec
        for match in re.finditer(r'FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\((\w+)\)(?:\s+ON DELETE (CASCADE|SET NULL|RESTRICT))?',ddl):
            col,parent,pcol,delete=match.groups()
            foreign.append({'table':table,'column':col,'parent':parent,'parent_column':pcol,'delete':delete or 'RESTRICT'})
            columns[col]['references']=[parent,pcol]
        for match in re.finditer(r'UNIQUE KEY \w+\s*\(([^)]+)\)',ddl):
            unique.append({'table':table,'columns':[c.strip() for c in match[1].split(',')]})
        result[table]=columns
    mapped=entities()
    for table,columns in mapped.items():
        result.setdefault(table,{})
        for col,spec in columns.items():
            # Retain baseline defaults and FK delete policies unless JPA supplies one.
            result[table][col]={**result[table].get(col,{}),**spec}
            if 'references' in spec and not any(f['table']==table and f['column']==col for f in foreign):
                foreign.append({'table':table,'column':col,'parent':spec['references'][0],'parent_column':spec['references'][1],'delete':'RESTRICT'})
    for table,columns in result.items():
        for col,spec in columns.items():
            # Hibernate's ManyToMany join uses (role_id, permission_id) as its PK;
            # the design SQL's surrogate ID is not required by the API or seed.
            if table=='role_permissions' and col=='id': spec['optional']=True
            if spec['primary'] or spec['unique']:
                unique.append({'table':table,'columns':[col],'primary':spec['primary']})
    return {'entities':mapped,'tables':result,'foreign_keys':foreign,'unique_keys':unique}


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description='Generate a new migration contract; do not overwrite an applied migration.')
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    if args.output.exists(): raise SystemExit('Output already exists; choose a new migration version')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(contract(),indent=2),encoding='utf8')
