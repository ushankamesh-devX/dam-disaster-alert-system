"""Start local MySQL, migrate and seed it, then start API/web.

Run from any directory: python api/scripts/setup_demo.py
Requires the project's api/.env, Docker Compose, and Python 3.
"""
import argparse
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
import http.client
from seed_demo import ROOT, DATABASE, records, compose_command


def compose(*args):
    subprocess.run([*compose_command(),*args],cwd=ROOT,check=True)


def wait_http(url):
    deadline=time.monotonic()+120
    while True:
        try:
            with urllib.request.urlopen(url,timeout=3) as response:
                if response.status==200: return
        except (OSError,http.client.HTTPException):
            pass
        if time.monotonic()>=deadline:
            raise RuntimeError('Service did not become ready: '+url+'; inspect docker compose logs')
        time.sleep(2)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database-only',action='store_true',help='Migrate and seed MySQL without starting API/web')
    parser.add_argument('--schema-only',action='store_true',help='Apply schema migrations without inserting demo data')
    args=parser.parse_args()
    if DATABASE!='dam_disaster_db' and not args.database_only:
        raise RuntimeError('A custom DDAS_SEED_DATABASE requires --database-only; API/web use the project database')
    compose('up','-d','mysql')
    compose('stop','api')
    deadline=time.monotonic()+120
    while True:
        try:
            records('SELECT 1 ready')
            break
        except RuntimeError:
            if time.monotonic()>=deadline:
                raise RuntimeError('MySQL did not become ready; check docker compose logs mysql')
            time.sleep(2)
    script='migrate_schema.py' if args.schema_only else 'seed_demo.py'
    subprocess.run([sys.executable,str(Path(__file__).with_name(script))],cwd=ROOT,check=True)
    if not args.database_only:
        compose('up','-d','--build','api','web')
        wait_http('http://localhost:8080/api/v1/health')
        wait_http('http://localhost')
    print(('Database schema setup completed.' if args.schema_only else 'Database schema and demo setup completed.')+('' if args.database_only else ' API: http://localhost:8080; Web: http://localhost'))


if __name__=='__main__':
    try: main()
    except (RuntimeError,OSError,subprocess.CalledProcessError) as error:
        raise SystemExit('Setup failed: '+str(error))
