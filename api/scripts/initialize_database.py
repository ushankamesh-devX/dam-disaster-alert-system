"""Container entry point for application migrations or MLflow database provisioning."""
import argparse
import os
import time

from seed_demo import records, sql, quote, initialize_rbac
from migrate_schema import migrate


def provision_mlflow():
    user=os.environ.get('DDAS_MLFLOW_USER','')
    if not user or user=='root':
        raise RuntimeError('DDAS_MLFLOW_USER must name the existing application MySQL user')
    if not records('SELECT User FROM mysql.user WHERE User='+quote(user)+" AND Host='%'"):
        raise RuntimeError('The MLflow application MySQL account does not exist')
    sql('CREATE DATABASE IF NOT EXISTS mlflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n'
        'GRANT ALL PRIVILEGES ON mlflow_db.* TO '+quote(user)+"@'%';")
    print('MLflow database and application-user grants are ready.')


def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mlflow-only',action='store_true')
    args=parser.parse_args()
    deadline=time.monotonic()+120
    while True:
        try:
            records('SELECT 1 ready')
            break
        except RuntimeError:
            if time.monotonic()>=deadline: raise
            time.sleep(2)
    if args.mlflow_only:
        provision_mlflow()
    else:
        migrate()
        initialize_rbac()
        migrate(check_only=True)
        print('Application schema and roles are ready.')


if __name__=='__main__':
    try: main()
    except (RuntimeError,OSError,ValueError,KeyError) as error:
        raise SystemExit('Database initialization failed: '+str(error))
