# Database configuration

The supported local setup uses MySQL in `api/docker-compose.yml`, with database
`dam_disaster_db`. MySQL is exposed on port **3306**; port **8081** is the
phpMyAdmin web interface, not a JDBC/MySQL port.

1. Create `api/.env` from `api/.env.example` and configure your MySQL credentials.
2. Set `DDAS_ADMIN_EMAIL`, `DDAS_ADMIN_PASSWORD` and optionally `DDAS_ADMIN_NAME`
   for the first administrator. Existing accounts are not changed.
3. From the repository root, initialize the database and start API/web:

```powershell
python api/scripts/setup_demo.py --schema-only
```

Omit `--schema-only` to include demo data. Add `--database-only` to initialize
without starting API/web. Database-only setup initializes roles and permissions;
the administrator account is created when the API starts.

Compose passes the database credentials and sets Hibernate to `validate`.
When running the API outside Docker, set `SPRING_DATASOURCE_URL` to
`jdbc:mysql://localhost:3306/dam_disaster_db`, supply
`SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`, and set
`SPRING_JPA_HIBERNATE_DDL_AUTO=validate` after migrating.
Also supply the `DDAS_ADMIN_*` values to that process if bootstrap is needed;
Maven does not automatically load Compose's `.env` file.

For a running Compose database, check schema compatibility without making changes:

```powershell
python api/scripts/migrate_schema.py --check
```

In phpMyAdmin, select the intended database before running `init_data.sql`.
That file only adds missing roles, permissions and assignments. It does not
create schemas or users, and it preserves existing records.

See the [full setup guide](../../README.md), [database source guide](../DB%20SCHEMA/README.md)
and [migration details](../scripts/DEMO-DATA.md). Kubernetes deploys run the migration Job before API rollout. The optional
Compose MLflow service provisions its database through `mlflow-db-init`.
