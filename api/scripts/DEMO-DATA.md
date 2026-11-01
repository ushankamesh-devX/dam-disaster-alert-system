# Complete DDAS demo seed

Run from the repository root:

```powershell
python api/scripts/setup_demo.py
```

Requires Python 3, Docker Compose and configured `api/.env` values. The setup
command starts MySQL, pauses the API, waits for the database, applies schema
migrations and seeds data, then builds/starts API and web and waits for HTTP readiness. For database setup
only, use `python api/scripts/setup_demo.py --database-only`; this also pauses
the API while upgrading. To seed an already-running database, run
`python api/scripts/seed_demo.py`.
No Python packages, external downloads, or private local seed files are required
for a fresh database. The configured MySQL user needs CREATE, ALTER, INSERT,
UPDATE and SELECT privileges. Database: `dam_disaster_db` by default; override
with `DDAS_SEED_DATABASE` (letters, digits and underscores only).

The command explicitly seeds the database when run; API startup does not seed it.
The seed itself does not create a login account. Full setup starts the API after
seeding; API startup creates the first `SUPER_ADMIN` from `DDAS_ADMIN_EMAIL`,
`DDAS_ADMIN_PASSWORD` and optional `DDAS_ADMIN_NAME` in `api/.env`. The password
is BCrypt-hashed and must be at least 8 characters and at most 72 UTF-8 bytes.
If an administrator already exists, account creation is skipped without changing
credentials. An existing non-admin email is never promoted or overwritten.
Leave both email and password blank to disable bootstrap; partial configuration
fails startup when no administrator exists. Database-only setup does not start
the API, so it does not create the administrator yet.
Existing accounts and permission assignments are retained; project-defined
roles and missing permission assignments are added.
Synthetic users have unusable passwords and the NORMAL_USER role.

## Database demo coverage

The existing generator adds 46,902 demo records across the 59 application tables
in the supplied core/news schemas plus device keys and alert audit logs:

| Dataset | Records |
| --- | ---: |
| Demo regions | 5 |
| Dams / current statuses | 10 / 10 |
| Gates / hazard zones | 30 / 30 |
| Sensors | 60 |
| Hourly readings, 30 days per sensor | 43,200 |
| Daily aggregates | 1,800 |
| Users | 100 |
| Alerts / reports / news | 100 / 150 / 30 |
| Safe locations | 30 |

Supporting data covers custom fields and templates, histories, emergency contacts,
SOS exercises, location sharing, delivery simulations, report comments/upvotes,
subscriptions, news interactions, sessions and audit records. Existing lookup
rows are reused. Unrelated tables are never filled with generated values.
Actual inserted totals also depend on lookup rows already present.

Schema setup runs before seeding on every invocation, including completed seeds.
Versioned files under `scripts/migrations/` are recorded with SHA-256 checksums
in `ddas_schema_migrations`. Checksums normalize line endings for Windows/Linux
consistency; Git also keeps migration files as LF. An applied migration cannot
be edited or removed.
The checked-in contract covers 63 application tables and all 534 mapped columns
from the 32 current Java entities. It checks unique keys, foreign keys and the
indexes declared by Java entities. The demo dataset still covers the original
59 tables; the four ML tables are created without invented operational records.

Missing tables/columns are created; compatible string/decimal sizes are widened;
enums and JSON are converted only after checking existing values. Nullability
is matched to the entity contract. Existing defaults, auto-increment behavior,
update timestamps, unrelated columns and existing FK delete policies are retained.
Hibernate's role-permission composite primary key is accepted alongside the
legacy design's surrogate ID. Unbound FK integer columns can be aligned to the
parent type after range checks. Other coordinated key-type changes stop for an
explicit migration. Foreign keys remain enabled, and DDL uses strict SQL mode.

V004 records main's removal of the four report entity mappings. Existing report
tables, columns, keys and demo records retain their V002 contract; this merge
does not drop or revert database structures. Historical migrations are unchanged.

V003 repairs the old seeder's invalid location-type references only for orphaned,
manifest-owned synthetic safe locations with matching demo lookup codes and a
verified demo user identity. Valid references and real records are retained.

V009 adds the forecast composite unique key (`dam_id`, `as_of`, `horizon_hours`)
and entity-declared indexes to the checked-in contract. The runner now creates
contract tables absent from V001: `dam_forecasts`, `dam_overflow_configs`,
`dam_status_history` and `dam_weather_data`. Existing duplicate forecasts stop
the upgrade with an error; records are not automatically deleted or merged.
Earlier migration files remain unchanged.

Schema-only setup also runs the repeatable `DB SCHEMA/init_data.sql` role and
permission initializer, so the first administrator can be created at API startup.
That SQL uses the selected database and never creates a hardcoded login. It can
also be run manually after migration. Standalone `migrate_schema.py` only handles
schema changes; use `setup_demo.py --schema-only` for complete initialization.

Private full backups are saved before schema changes to
`api/local-data/<database>/before-schema-*.sql`. MySQL DDL can commit separately;
failed migrations remain unrecorded and can resume their idempotent steps.
Invalid JSON, duplicate keys, non-demo orphans, NULLs in required fields, unknown
enum values and ambiguous renames stop with a precise error. Required missing
columns on populated tables need an explicit backfill rather than guessed data.
No table, column or user record is dropped by the supplied migrations.

Docker Compose now uses Hibernate `ddl-auto=validate`, so API startup checks the
schema without silently modifying it. Run setup before starting the API on a
fresh database. The standalone application.properties fallback is unchanged.

Read-only compatibility check, or schema upgrade without inserting demo data:

```powershell
python api/scripts/migrate_schema.py --check
python api/scripts/migrate_schema.py
```

When entity mappings change, create a **new** migration contract, review it and
commit it with the entity changes. Never overwrite a migration already shared:

```powershell
python api/scripts/schema_contract.py --output api/scripts/migrations/V010__entity_contract.json
```

A new contract handles additive/widening changes. A rename, backfill or coordinated
conversion requires a reviewed new SQL migration before that contract. Future
SQL migrations must be resumable because MySQL DDL is not transactional.
Entity drift without a new matching contract is rejected before schema changes.

After general seeded geography is generated, DEMO-002 becomes Victoria Dam.
Its bundled attributed reference geometry is applied, followed by three nested,
unverified danger corridors and plausible demo equipment/shelter locations.
A Kandy District region is reused or added separately. Readings remain synthetic.
The seed does not modify web/mobile source files. OSM attribution and source
links are retained in `fixtures/victoria-geography.json` (ODbL 1.0).

## Mobile demo fixtures

Seven datasets, 36 records, are preserved in `ddas_demo_ui_fixtures` as JSON:

| Fixture key | Records | Source |
| --- | ---: | --- |
| ISSUE_TYPES | 5 | ReportIssues/mockData.ts |
| DAMS | 8 | ReportIssues/mockData.ts |
| MOCK_REPORTS | 8 | ReportIssues/mockData.ts |
| mockGuidelines | 3 | data/mock-guidelines.ts |
| safe-location-cards | 4 | Emergency Contact/SafeLocations.tsx |
| emergency-safe-locations | 4 | Emergency Contact/EmergencySafeLocationFlow.tsx |
| mockHazardLevels | 4 | Hazardmap/HazardLegend.tsx |

These are preserved fixtures, not replacements for operational records. The
Indian dam examples, relative report dates (snapshot 11 October 2026), screen
marker positions and four-level legend cannot safely be merged into the Sri
Lankan map scenario or five-level backend taxonomy. Guidelines have no existing
API entity. UI components continue to use their current sources; adding API
consumers for these fixtures is separate work. Display colours, form choices,
loading placeholders and icon lists are UI configuration, not seed records.
The web's demo geography is included in the Victoria reference fixture; no
other web business-record mock dataset was found in the source inventory.

## Repeat runs and recovery

`ddas_demo_seed_runs` stores inserted ID ranges and the completed phase inside
the database. The base rows and manifest commit together with foreign keys
enabled. Geography/Victoria phases have independent transactions; a failed
run resumes the pending phase. MySQL DDL is not transactionally rolled back.
Completed runs validate without regenerating readings or resetting geography.
The seven owned mobile fixtures are synchronized with the bundled snapshot.
Run one seeder at a time, with application writes paused during first-time seeding.

Private backups and generated SQL are under ignored
`api/local-data/<database>/`. Repeat runs do not depend on those files.
An old v1 dataset can be adopted using its original local manifest after verifying
ID-range counts and a deterministic demo user UUID. A legacy dataset without
that manifest is rejected instead of guessing ownership or duplicating records.
Existing unsupported/incomplete lookups fail with an explanation rather than
changing their meaning. The script does not silently repair deleted demo rows.

Validate without modifying database records:

```powershell
python api/scripts/seed_demo.py --validate-only
```

Checks cover foreign-key orphans, manifest-owned record counts, current status
against gate totals/latest water readings, and mobile fixture coverage. First-run
geography checks additionally verify nested contours, point placement and Victoria
shelters outside the zones/on land. The summary reports the selected database,
phase, demo row count and validation results.

All telemetry, incidents, alerts, shelters and hazard contours are fictional.
Alerts use simulation mode; push delivery examples are historical simulated
records, SMS delivery is skipped and email delivery is disabled, sessions are expired and
device API keys are disabled. No notification service is called by this script.
Report media metadata does not create uploaded files. Seeding tables does not
add endpoints for modules that have not been implemented.


## Verification on 11 October 2026

- Fresh SQL-schema database: seed and Victoria phases completed; all 143 foreign-key relationships had zero orphans.
- Database with pre-existing users, regions, dams and sensors: complete seed succeeded; every pre-existing record was unchanged, and new sensors/statuses linked only to new demo dams.
- Repeat seed and validate-only runs with the local manifest temporarily absent: complete database dump checksums were unchanged.
- Project local database: legacy dataset adopted; 46,902 existing demo records retained, seven mobile fixtures containing 36 records installed, 124 foreign-key checks passed before schema reconciliation; the upgraded schema now passes all 143 checks, with both existing accounts preserved.
- Authenticated local API: admin login and Victoria detail, current status, hazard zones, gates and sensors returned successfully. API health returned HTTP 200.

Repeat the automated database check against an already-created disposable
schema whose name starts with `ddas_seed_` and on which the Compose MySQL user
has privileges:

```powershell
python api/scripts/verify_demo.py --database ddas_seed_test
```

The check seeds that schema, hides the local manifest temporarily, runs seed and
validate-only again, and compares database dumps. It does not drop the database.


Additional schema-upgrade verification:

- Empty database: all 59 tables created, current entity contract applied, seeding completed and repeat database checksums unchanged.
- Populated old SQL schema: enum/purpose/nullability upgrades completed; original record field values retained.
- Project Hibernate schema: omitted columns and constraints added, legacy demo references repaired, device-key integer types aligned; all 143 foreign-key checks passed.
- A temporary API container started against the migrated database with `ddl-auto=validate` and was stopped after verification.


For deployment, apply schema updates without installing demo records:

```powershell
python api/scripts/setup_demo.py --schema-only
```

The current `.github/workflows/ci-cd.yml` builds API, web and migration images
with the same commit tag. On an explicitly requested deployment it copies the
release's Kubernetes scripts to EC2, then runs `k8s/deploy.sh`. The deployment
pauses the API, runs a migration Job through MySQL Router's primary port (6446),
and starts the new API/web only after migrations and role initialization succeed.
A deployment lock prevents concurrent upgrades. See [Kubernetes database setup](../../k8s/DATABASE.md).

The migration Job stores pre-change dumps on the `db-migration-backups` PVC.
Failure leaves the API stopped because MySQL DDL may already have committed.
Inspect the failed Job before retrying; do not automatically restore an older
application against a partially migrated schema. Backups are retained independently
of Jobs and require disk-space monitoring and an off-node backup policy.

Compose's optional MLflow service now waits for `mlflow-db-init` to complete.
That initializer creates `mlflow_db` and grants the configured application user
access, including on existing MySQL volumes. It preserves database contents and
account passwords. MLflow owns its internal tables. Start it with:

```powershell
docker compose -f api/docker-compose.yml up -d --build mlflow
```

Additional disposable-database migration checks:

```powershell
python api/scripts/verify_migrations.py --database ddas_seed_migrations_20261011
```

This deliberately simulates older FK integer types, a missing FK, a smaller
string column and invalid JSON in the test schema. It verifies record
preservation during safe upgrades and unchanged database dumps after rejected
JSON or modified-history migrations. Do not use it on operational databases.

## Verification on 1 November 2026

```powershell
python -m unittest discover -s api/scripts -p 'test_*.py' -v
```

Checks cover contract drift, missing-table creation, repeatable initialization,
schema-only role setup, forecast uniqueness, index reconciliation and legacy
unsigned parent keys. These do not replace the disposable MySQL checks above.
For container-level verification, build the migration image and run:

```powershell
docker build -f api/Dockerfile.migrations -t ddas-migrations:verification api
python api/scripts/verify_container_setup.py
```

This creates an isolated MySQL container and network, checks fresh/repeat schema
setup, MLflow database permissions and data preservation, then runs the full demo
and migration checks. It removes the temporary containers/network on exit. Test
backups remain in ignored `api/local-data/`. No existing application database is
used. The October verification results above are historical.


The isolated MySQL 8.0 verification passed both with `--host-runner` and with
the successfully built migration image (Python 3.12): all 63
application tables were created; repeat setup required no schema changes;
roles were initialized without a default login; backups were persisted; MLflow
provisioning preserved an existing test row and allowed application-user access.
The complete 46,902-row demo seed passed all 147 foreign-key checks. Repeat seed
and validation preserved the database contents. Legacy FK/string repairs,
invalid-JSON rejection and edited-history rejection also passed. The temporary
MySQL container and network were removed. No existing application database or
live Kubernetes cluster was modified.

The 19 offline tests, Compose configuration validation, shell syntax checks and
GitHub workflow validation also passed. The CI build runs the same disposable
container suite before permitting deployment. Live Kubernetes scheduling,
MySQL 8.4 cluster behavior and PVC provisioning have not been exercised here.
