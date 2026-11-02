"""Offline transport, provisioning and deployment failure-path checks."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import initialize_database
import seed_demo


class DatabaseTransportTests(unittest.TestCase):
    def test_local_client_uses_router_and_keeps_password_out_of_arguments(self):
        env={'DDAS_MYSQL_TRANSPORT':'local','DDAS_MYSQL_HOST':'ddas-db-router',
             'DDAS_MYSQL_PORT':'6446','MYSQL_USER':'test_user','MYSQL_PASSWORD':'private-value'}
        with patch.dict(os.environ,env), patch.object(seed_demo.subprocess,'run',
                return_value=subprocess.CompletedProcess([],0,b'ok',b'')) as run:
            self.assertEqual(seed_demo.sql('SELECT 1;'),'ok')
        command=run.call_args.args[0]
        self.assertIn('--host=ddas-db-router',command)
        self.assertIn('--port=6446',command)
        self.assertNotIn('private-value',' '.join(command))
        self.assertEqual(run.call_args.kwargs['env']['MYSQL_PWD'],'private-value')

    def test_unknown_transport_does_not_fall_back_to_compose(self):
        with patch.dict(os.environ,{'DDAS_MYSQL_TRANSPORT':'typo'}), \
                patch.object(seed_demo,'docker') as docker:
            with self.assertRaisesRegex(RuntimeError,'Unsupported'):
                seed_demo.sql('SELECT 1;')
            docker.assert_not_called()

    def test_mlflow_initialization_only_creates_database_and_grants(self):
        with patch.dict(os.environ,{'DDAS_MLFLOW_USER':'test_app'}), \
                patch.object(initialize_database,'records',return_value=[{'User':'test_app'}]), \
                patch.object(initialize_database,'sql') as sql:
            initialize_database.provision_mlflow()
        query=sql.call_args.args[0]
        self.assertIn('CREATE DATABASE IF NOT EXISTS mlflow_db',query)
        self.assertIn("ON mlflow_db.* TO 'test_app'@'%'",query)
        self.assertNotRegex(query,r'DROP|ALTER USER|IDENTIFIED BY')

    def test_missing_mlflow_account_stops_without_granting_access(self):
        with patch.dict(os.environ,{'DDAS_MLFLOW_USER':'missing'}), \
                patch.object(initialize_database,'records',return_value=[]), \
                patch.object(initialize_database,'sql') as sql:
            with self.assertRaisesRegex(RuntimeError,'does not exist'):
                initialize_database.provision_mlflow()
            sql.assert_not_called()


class DeploymentTests(unittest.TestCase):
    def run_deploy(self, result):
        bash=Path('C:/Program Files/Git/bin/bash.exe') if os.name=='nt' else None
        bash=str(bash) if bash and bash.exists() else shutil.which('bash')
        if not bash: self.skipTest('Bash is unavailable')
        with tempfile.TemporaryDirectory() as folder:
            folder=Path(folder)
            log=folder/'commands.log'
            stub=folder/'kubectl'
            stub.write_text('''#!/usr/bin/env bash
echo "$*" >> "$DDAS_TEST_LOG"
case "$*" in
  *"get deployment api --ignore-not-found"*) echo deployment.apps/api ;;
  *"get deployment api"*) echo 2 ;;
  *"get job "*) echo "$DDAS_TEST_RESULT" ;;
  *"create -f -"*) cat >/dev/null ;;
esac
''',encoding='utf8')
            stub.chmod(0o755)
            lock=folder/'flock'
            lock.write_text('#!/usr/bin/env bash\nexit 0\n',encoding='utf8')
            lock.chmod(0o755)
            env={**os.environ,'PATH':str(folder)+os.pathsep+os.environ['PATH'],
                'DDAS_TEST_LOG':log.as_posix(),'DDAS_TEST_RESULT':result}
            script=Path(__file__).resolve().parents[2]/'k8s/deploy.sh'
            completed=subprocess.run([bash,str(script),'test-release'],env=env,capture_output=True,text=True)
            return completed,log.read_text() if log.exists() else ''

    def test_failed_migration_never_updates_images_or_restarts_api(self):
        result,commands=self.run_deploy(',1')
        self.assertNotEqual(result.returncode,0)
        self.assertIn('scale deployment/api --replicas=0',commands)
        self.assertNotIn('set image',commands)
        self.assertNotIn('--replicas=2',commands)
        self.assertIn('API remains stopped',result.stderr)

    def test_successful_migration_precedes_api_then_web_rollout(self):
        result,commands=self.run_deploy('1,')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertLess(commands.index('create -f -'),commands.index('set image deploy/api'))
        self.assertLess(commands.index('set image deploy/api'),commands.index('--replicas=2'))
        self.assertLess(commands.index('rollout status deploy/api'),commands.index('set image deploy/web'))
