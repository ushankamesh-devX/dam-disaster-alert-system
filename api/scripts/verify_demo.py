"""Integration check against an already-created disposable Docker MySQL database.

Run: python scripts/verify_demo.py --database ddas_seed_test
The Compose MySQL user must have permissions on that database.
"""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',required=True)
    args=parser.parse_args()
    if not args.database.startswith('ddas_seed_'):
        raise SystemExit('Use a disposable database whose name begins with ddas_seed_')
    os.environ['DDAS_SEED_DATABASE']=args.database
    import seed_demo as seed

    def run(*flags):
        subprocess.run([sys.executable,str(Path(__file__).with_name('seed_demo.py')),*flags],
            cwd=seed.ROOT,env=os.environ,check=True)

    def digest():
        data=seed.docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction --no-tablespaces --set-gtid-purged=OFF --compact --no-create-info --skip-add-locks $MYSQL_DATABASE')
        return hashlib.sha256(data).digest()

    run()
    before=digest()
    manifest=seed.OUT/'seed-manifest.json'
    hidden=manifest.with_suffix('.json.verify-backup')
    if hidden.exists():
        raise SystemExit('A previous verification backup exists; inspect it before retrying')
    manifest.rename(hidden)
    try:
        run()
        run('--validate-only')
        if digest()!=before:
            raise RuntimeError('Repeat or validation run changed database contents')
    finally:
        hidden.replace(manifest)
    print('PASS: seed, repeat without local manifest, validate-only, and unchanged database contents')


if __name__=='__main__':
    main()
