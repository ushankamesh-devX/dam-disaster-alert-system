# Database setup sources

Use the versioned migrations in `api/scripts/migrations/` and the runner in
`api/scripts/migrate_schema.py` for current application schemas. From the repository
root, after configuring `api/.env`:

```powershell
python api/scripts/setup_demo.py --schema-only --database-only
```

This initializes `dam_disaster_db`, including roles and permissions, without demo
records. Omit `--database-only` to also build/start API and web. API startup creates
the first administrator from `DDAS_ADMIN_EMAIL` and `DDAS_ADMIN_PASSWORD`.

`init_data.sql` is the repeatable role/permission initializer used by setup. For
manual execution, select the intended, already-migrated database first. It does
not change databases or insert user accounts.

`ddas_complete_schema.sql`, `ddas_news_schema.sql`, `sample_sensor_data.sql` and
`migrations/` in this folder are legacy design/reference scripts, not an up-to-date
installation sequence. The full schema also contains older default role codes.
Do not import it over a current database or edit historical versioned migrations.
The contract generator still reads its baseline table definitions.

See [migration details and verification](../scripts/DEMO-DATA.md), including the
Kubernetes migration Jobs and optional MLflow database initialization.
