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
The checked-in contract covers the 59 baseline tables and all 533 mapped columns
from the 31 current Java entities. It also checks unique keys and foreign keys.

Missing tables/columns are created; compatible string/decimal sizes are widened;
enums and JSON are converted only after checking existing values. Nullability
is matched to the entity contract. Existing defaults, auto-increment behavior,
update timestamps, unrelated columns and existing FK delete policies are retained.
Hibernate's role-permission composite primary key is accepted alongside the
legacy design's surrogate ID. Unbound FK integer columns can be aligned to the
parent type after range checks. Other coordinated key-type changes stop for an
explicit migration. Foreign keys remain enabled, and DDL uses strict SQL mode.

V003 repairs the old seeder's invalid location-type references only for orphaned,
manifest-owned synthetic safe locations with matching demo lookup codes and a
verified demo user identity. Valid references and real records are retained.

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
python api/scripts/schema_contract.py --output api/scripts/migrations/V004__entity_contract.json
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
records, email/SMS delivery statuses are disabled, sessions are expired and
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

The existing DigitalOcean workflow now runs
`python3 scripts/setup_demo.py --schema-only --database-only` after building and
before starting the API. Migration failure stops deployment. Python 3 must be
available on the deployment host; both `docker compose` and `docker-compose`
are supported. This workflow change was reviewed locally; no live deployment
was triggered during validation.

Additional disposable-database migration checks:

```powershell
python api/scripts/verify_migrations.py --database ddas_seed_migrations_20261011
```

This deliberately simulates older FK integer types, a missing FK, a smaller
string column and invalid JSON in the test schema. It verifies record
preservation during safe upgrades and unchanged database dumps after rejected
JSON or modified-history migrations. Do not use it on operational databases.
