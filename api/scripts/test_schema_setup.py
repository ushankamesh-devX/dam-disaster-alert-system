"""Offline migration regressions. Run: python -m unittest discover -s api/scripts -p 'test_*.py'."""
import json
import re
import unittest
from unittest.mock import patch

import migrate_schema as migration
import schema_contract
import seed_demo
import setup_demo


LATEST=sorted(migration.MIGRATIONS.glob('*.json'))[-1]
CONTRACT=json.loads(LATEST.read_text(encoding='utf8'))
NEW_TABLES={'dam_forecasts','dam_overflow_configs','dam_status_history','dam_weather_data'}


class SchemaSetupTests(unittest.TestCase):
    def test_checked_in_contract_matches_current_models_and_constraints(self):
        self.assertEqual(CONTRACT,schema_contract.contract())

    def test_post_baseline_tables_are_created_with_all_required_columns(self):
        baseline={table for table,_ in schema_contract.base_tables()}
        self.assertEqual(set(CONTRACT['tables'])-baseline,NEW_TABLES)
        actions=migration.table_plan(CONTRACT,baseline)
        self.assertEqual(len(actions),4)
        for table in NEW_TABLES:
            statement=next(s for s in actions if f'`{table}` (' in s)
            for column,spec in CONTRACT['tables'][table].items():
                self.assertIn(f'`{column}` '+spec['type'],statement)
            self.assertIn('AUTO_INCREMENT PRIMARY KEY',statement)
            # Parent key types are reconciled before FKs are added by key_plan.
            self.assertNotIn('FOREIGN KEY',statement)
        forecast=next(s for s in actions if '`dam_forecasts` (' in s)
        self.assertIn('`demo_mode` boolean NOT NULL DEFAULT FALSE',forecast)
        self.assertIn('`as_of` datetime(6) NOT NULL',forecast)

    def test_existing_tables_are_never_recreated(self):
        self.assertEqual(migration.table_plan(CONTRACT,set(CONTRACT['tables'])),[])

    def test_read_only_check_reports_missing_new_tables_without_writes(self):
        tables=[{'TABLE_NAME':t} for t in CONTRACT['tables'] if t not in NEW_TABLES]
        with patch.object(migration,'records',return_value=tables), patch.object(migration,'sql') as sql:
            with self.assertRaisesRegex(RuntimeError,'missing tables.*dam_forecasts'):
                migration.migrate(check_only=True)
            sql.assert_not_called()

    def test_table_annotation_drift_is_rejected_before_writes(self):
        with patch.object(migration,'records',return_value=[]), \
                patch.object(migration,'entity_constraints',return_value={}), \
                patch.object(migration,'sql') as sql:
            with self.assertRaisesRegex(RuntimeError,'Java table constraints changed'):
                migration.migrate()
            sql.assert_not_called()

    def test_forecast_uniqueness_is_part_of_contract(self):
        key={'table':'dam_forecasts','columns':['dam_id','as_of','horizon_hours']}
        self.assertIn(key,CONTRACT['unique_keys'])
        with patch.object(migration,'existing_keys',return_value=(set(),{})), \
                patch.object(migration,'metadata',return_value={('dam_forecasts',c):{} for c in key['columns']}), \
                patch.object(migration,'count',return_value=0):
            actions=migration.key_plan({'unique_keys':[key],'foreign_keys':[]})
        self.assertIn('UNIQUE KEY',actions[0])
        self.assertIn('(`dam_id`,`as_of`,`horizon_hours`)',actions[0])

    def test_duplicate_forecasts_stop_unique_constraint_upgrade(self):
        key={'table':'dam_forecasts','columns':['dam_id','as_of','horizon_hours']}
        with patch.object(migration,'existing_keys',return_value=(set(),{})), \
                patch.object(migration,'metadata',return_value={('dam_forecasts',c):{} for c in key['columns']}), \
                patch.object(migration,'count',return_value=1):
            with self.assertRaisesRegex(RuntimeError,'duplicate values'):
                migration.key_plan({'unique_keys':[key],'foreign_keys':[]})

    def test_new_table_fk_adapts_to_legacy_unsigned_parent(self):
        metadata={('dam_forecasts','dam_id'):{'COLUMN_TYPE':'bigint','IS_NULLABLE':'NO',
                    'COLUMN_DEFAULT':'NULL','EXTRA':''},
                  ('dams','id'):{'COLUMN_TYPE':'bigint unsigned'}}
        fk={'table':'dam_forecasts','column':'dam_id','parent':'dams','parent_column':'id','delete':'RESTRICT'}
        with patch.object(migration,'existing_keys',return_value=(set(),{})), \
                patch.object(migration,'metadata',return_value=metadata), \
                patch.object(migration,'count',return_value=0):
            actions=migration.key_plan({'unique_keys':[],'foreign_keys':[fk]})
        self.assertIn('MODIFY COLUMN `dam_id` bigint unsigned NOT NULL',actions[0])
        self.assertIn('FOREIGN KEY (`dam_id`) REFERENCES `dams` (`id`)',actions[1])

    def test_equivalent_index_is_not_duplicated(self):
        index={'table':'dam_forecasts','name':'idx_forecast_dam_asof','columns':['dam_id','as_of']}
        rows=[{'TABLE_NAME':'dam_forecasts','INDEX_NAME':'legacy_index','COLUMN_NAME':c,'SUB_PART':'NULL'}
              for c in index['columns']]
        with patch.object(migration,'records',return_value=rows):
            self.assertEqual(migration.index_plan({'indexes':[index]}),[])
        with patch.object(migration,'records',return_value=[]):
            self.assertIn('(`dam_id`,`as_of`)',migration.index_plan({'indexes':[index]})[0])

    def test_conflicting_named_index_is_not_silently_replaced(self):
        index={'table':'dam_forecasts','name':'idx_forecast_dam_asof','columns':['dam_id','as_of']}
        row={'TABLE_NAME':'dam_forecasts','INDEX_NAME':index['name'],'COLUMN_NAME':'id','SUB_PART':'NULL'}
        with patch.object(migration,'records',return_value=[row]):
            with self.assertRaisesRegex(RuntimeError,'existing index differs'):
                migration.index_plan({'indexes':[index]})

    def test_rbac_initializer_is_repeatable_and_has_no_default_account(self):
        source=(seed_demo.ROOT/'DB SCHEMA/init_data.sql').read_text(encoding='utf8')
        source=re.sub(r'--[^\n]*','',source)
        self.assertNotRegex(source,r'\bUSE\b|INSERT INTO users')
        with patch.object(seed_demo,'sql') as sql:
            seed_demo.initialize_rbac()
        query=sql.call_args.args[0]
        self.assertEqual(query.count('INSERT INTO'),6)
        self.assertEqual(query.count('ON DUPLICATE KEY UPDATE'),6)
        self.assertNotIn('role_permissions.id',query)  # Composite-PK Hibernate schemas.
        self.assertIn('SUPER_ADMIN',query)
        self.assertIn('NORMAL_USER',query)

    def test_schema_only_setup_initializes_roles_after_migration(self):
        events=[]
        with patch('sys.argv',['setup_demo.py','--schema-only','--database-only']), \
                patch.object(setup_demo,'compose'), patch.object(setup_demo,'records'), \
                patch.object(setup_demo.subprocess,'run',side_effect=lambda *a,**k:events.append('migrate')), \
                patch.object(setup_demo,'initialize_rbac',side_effect=lambda:events.append('roles')):
            setup_demo.main()
        self.assertEqual(events,['migrate','roles'])

    def test_demo_delivery_finalization_uses_current_non_sending_status(self):
        manifest={'tables':[{'table':t,'ids':[1,1]} for t in CONTRACT['tables']]}
        with patch.object(seed_demo,'sql',side_effect=RuntimeError('stop before DB access')) as sql:
            with self.assertRaisesRegex(RuntimeError,'stop before DB access'):
                seed_demo.finalize(manifest)
        query=sql.call_args.args[0]
        self.assertIn('l.sms_status="skipped"',query)
        self.assertNotIn('l.sms_status="disabled"',query)


if __name__=='__main__':
    unittest.main()
