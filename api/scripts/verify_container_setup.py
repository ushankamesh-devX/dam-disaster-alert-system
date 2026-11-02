"""Test the migration image using an isolated disposable MySQL container.

Build first: docker build -f api/Dockerfile.migrations -t ddas-migrations:verification api
Run: python api/scripts/verify_container_setup.py
No application containers or databases are accessed. Temporary containers/network
are removed on exit; migration backups remain under ignored api/local-data/.
"""
import argparse
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
import uuid


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',default='ddas-migrations:verification')
    parser.add_argument('--mysql-image',default='mysql:8.0')
    parser.add_argument('--host-runner',action='store_true',help='Use host Python with Docker MySQL clients instead of the migration image')
    args=parser.parse_args()
    name='ddas-migration-check-'+uuid.uuid4().hex[:10]
    database='ddas_seed_check'
    root_pw=secrets.token_hex(24)
    app_pw=secrets.token_hex(24)
    env={**os.environ,'MYSQL_ROOT_PASSWORD':root_pw,'MYSQL_PASSWORD':app_pw}
    backups=Path(__file__).resolve().parents[1]/'local-data'/name
    backups.mkdir(parents=True)

    def run(*command, env_override=None, data=None):
        result=subprocess.run(['docker',*command],env={**env,**(env_override or {})},
            input=data,capture_output=True,text=True)
        if result.returncode: raise RuntimeError(result.stderr or result.stdout)
        return result.stdout

    def sql(query, user='root', password=root_pw, db=database):
        return run('exec','-i','-e','MYSQL_PWD',name,'mysql','--user='+user,
            '--database='+db,'--batch','--skip-column-names',
            env_override={'MYSQL_PWD':password},data=query)

    def image(*command, root=False, entrypoint=None):
        if args.host_runner:
            scripts=Path(__file__).resolve().parent
            script=scripts/Path(command[0]).name if entrypoint else scripts/'initialize_database.py'
            arguments=command[1:] if entrypoint else command
            result=subprocess.run([sys.executable,str(script),*arguments],capture_output=True,text=True,
                env={**env,'DDAS_MYSQL_TRANSPORT':'container','DDAS_MYSQL_CONTAINER':name,
                    'DDAS_SEED_DATABASE':database,'DDAS_BACKUP_DIR':str(backups),
                    'MYSQL_USER':'root' if root else 'test_app','MYSQL_PASSWORD':root_pw if root else app_pw,
                    'DDAS_MLFLOW_USER':'test_app'})
            if result.returncode: raise RuntimeError(result.stdout+result.stderr)
            return result.stdout
        flags=['run','--rm','--network',name,'-e','DDAS_MYSQL_HOST='+name,
            '-e','DDAS_SEED_DATABASE='+database,'-e','MYSQL_USER='+('root' if root else 'test_app'),
            '-e','MYSQL_PASSWORD','-e','DDAS_MLFLOW_USER=test_app',
            '--mount',f'type=bind,source={backups},target=/backups']
        if entrypoint: flags.extend(['--entrypoint',entrypoint])
        return run(*flags,args.image,*command,
            env_override={'MYSQL_PASSWORD':root_pw if root else app_pw})

    try:
        run('network','create',name)
        run('run','-d','--name',name,'--network',name,'--tmpfs','/var/lib/mysql',
            '-e','MYSQL_ROOT_PASSWORD','-e','MYSQL_PASSWORD','-e','MYSQL_USER=test_app',
            '-e','MYSQL_DATABASE='+database,args.mysql_image)
        deadline=time.monotonic()+120
        while True:
            try:
                sql('SELECT 1;')
                break
            except RuntimeError:
                if time.monotonic()>=deadline: raise
                time.sleep(2)
        print(image(),flush=True)
        assert sql('SELECT COUNT(*) FROM roles;').strip()=='4'
        assert sql('SELECT COUNT(*) FROM users;').strip()=='0'
        assert sql("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('dam_forecasts','dam_overflow_configs','dam_status_history','dam_weather_data');").strip()=='4'
        assert list(backups.rglob('before-schema-*.sql')), 'No persistent backup was saved'
        print(image(),flush=True)
        print('PASS: fresh setup and repeat run; required tables/roles, no default login, persistent backup.',flush=True)
        print(image('--mlflow-only',root=True),flush=True)
        sql('CREATE TABLE preservation_probe (id INT PRIMARY KEY); INSERT INTO preservation_probe VALUES (42);',
            'test_app',app_pw,'mlflow_db')
        print(image('--mlflow-only',root=True),flush=True)
        assert sql('SELECT id FROM preservation_probe;', 'test_app',app_pw,'mlflow_db').strip()=='42'
        print('PASS: MLflow provisioning grants access and preserves existing data on repeat.',flush=True)
        print(image('scripts/verify_demo.py','--database',database,entrypoint='python3'),flush=True)
        print(image('scripts/verify_migrations.py','--database',database,entrypoint='python3'),flush=True)
        print('PASS: container, full demo seed, repeatability and migration preservation checks.',flush=True)
    finally:
        subprocess.run(['docker','rm','-f','-v',name],capture_output=True)
        subprocess.run(['docker','network','rm',name],capture_output=True)


if __name__=='__main__':
    main()
