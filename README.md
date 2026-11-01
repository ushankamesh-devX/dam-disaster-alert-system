# Dam Disaster Alert System (DDAS)

DDAS includes a Spring Boot API, a React web dashboard, an Expo mobile app,
and MySQL. This guide explains how to start the complete system locally.
Commands below use PowerShell and start from the repository root unless stated
otherwise. On macOS/Linux, use `npm` instead of `npm.cmd`; the mobile preview
helper is a PowerShell script intended for Windows.

## Requirements

- Docker Desktop running with Linux containers and Docker Compose available.
- Python 3 for database setup and demo seeding; no extra Python packages needed.
- Node.js 22.13 or newer in the 22.x line (or Node.js 24) and npm for local web/mobile development.
- Expo Go compatible with the project's Expo SDK 57 for phone previews.
- Java 17 only if running the API outside Docker. The Maven wrapper is included.
- Internet access on the first run to download Docker images and dependencies.

Check the tools you need:

```powershell
docker compose version
python --version
node --version
npm.cmd --version
```

## 1. Configure the database

From your cloned repository folder, create the local environment file if missing:

```powershell
if (-not (Test-Path api/.env)) {
    Copy-Item api/.env.example api/.env
}
```

Edit `api/.env` and replace both password placeholders with your own passwords:

```dotenv
MYSQL_ROOT_PASSWORD=replace_with_your_local_root_password
MYSQL_USER=ddas_user
MYSQL_PASSWORD=replace_with_your_local_user_password
DDAS_ADMIN_EMAIL=your-admin-email@example.com
DDAS_ADMIN_PASSWORD=replace_with_your_admin_login_password
DDAS_ADMIN_NAME=DDAS Administrator
```

Keep this file private. For an existing database volume, use the credentials
with which that database was initialized; editing the file does not change
existing MySQL passwords.

## 2. Start the database, API and web with demo data

```powershell
python api/scripts/setup_demo.py
```

The script starts MySQL, stops the API while upgrading the database, applies
versioned schema migrations, inserts demo data, builds and starts the API/web,
and waits for their HTTP endpoints. Initial setup can take several minutes.

Repeated runs preserve existing accounts and records and do not duplicate a
completed demo seed. Schema upgrades are checked on each run. Private backups
are stored under ignored `api/local-data/`.

To also start the optional database browser:

```powershell
docker compose -f api/docker-compose.yml up -d phpmyadmin
```

| Service | Address |
| --- | --- |
| Web dashboard | http://localhost/login |
| API base URL | http://localhost:8080/api/v1 |
| API health | http://localhost:8080/api/v1/health |
| Spring health | http://localhost:8080/actuator/health |
| phpMyAdmin (optional) | http://localhost:8081 |
| MySQL from a desktop database client | `127.0.0.1:3307`, database `dam_disaster_db` |

For phpMyAdmin, use server `mysql` if prompted and the MySQL user/password from
`api/.env`. The Docker web app already proxies `/api/v1` to the local API;
no web environment file is needed for this Docker path.

## 3. Sign in

On a fresh database, setup starts the API after migrations/seeding. API startup
creates the first `SUPER_ADMIN` using `DDAS_ADMIN_EMAIL`, `DDAS_ADMIN_PASSWORD`
and `DDAS_ADMIN_NAME` from `api/.env`. Open http://localhost/login and use those
credentials, then open `/admin/dashboard`.

The password is stored as a BCrypt hash. Use at least 8 characters and at most
72 UTF-8 bytes. Existing administrator accounts are retained: rerunning setup
or changing the environment does not reset passwords or create another admin.
An email already registered to a different account is rejected rather than
silently promoting that account.

Leaving both administrator email and password blank disables account creation;
setting just one fails startup when no administrator exists. Database-only
setup does not create a login account until the API starts. Seeded synthetic
users have unusable passwords. Public registration at `/register` creates
`NORMAL_USER` accounts, which do not have management dashboard access.

## 4. Start the mobile app

Keep the Docker API/database running. Open another PowerShell terminal:

```powershell
cd app
npm.cmd ci
npm.cmd run mobile:tunnel
```

The helper checks the local API, creates a regular demo viewer account if
needed, writes ignored `.env.local` settings, and starts Expo Go on port 8082.
It forwards API requests through the same Expo tunnel, so the phone and computer
do not need to be on the same Wi-Fi. Both need internet access.

Scan the terminal QR code with Expo Go (or the iPhone Camera app). Keep this
terminal open. Stop Expo with `Ctrl+C`; rerun `mobile:tunnel` to start it again.
The preview embeds a local demo viewer's credentials and is intended for
temporary development previews. Details: [mobile preview guide](app/MOBILE-PREVIEW.md).

## Local web development with hot reload

Run the Docker setup first so that the API/database are available. In a separate
PowerShell terminal from the repository root:

```powershell
cd web
npm.cmd ci
Set-Content .env.local 'VITE_API_URL=http://localhost:8080/api/v1'
npm.cmd run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/login (or the URL Vite prints if that port is occupied).
The command writes the local API URL to `web/.env.local`; restart Vite after
changing it. Docker web on port 80 and Vite on port 5173 can run together.
After changing web code, rerun the setup command to rebuild the Docker web image,
or use Vite to see changes immediately.

## Restart, stop and inspect the system

After initial setup, start the existing services without rebuilding or seeding:

```powershell
docker compose -f api/docker-compose.yml up -d mysql api web
```

For code or schema updates, rerun `python api/scripts/setup_demo.py` instead.

Inspect service status, logs and API readiness:

```powershell
docker compose -f api/docker-compose.yml ps
docker compose -f api/docker-compose.yml logs --tail 100 api web mysql
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Stop the containers while retaining the database:

```powershell
docker compose -f api/docker-compose.yml down
```

Do not add `-v` unless you intend to delete the stored MySQL data. Stop Vite and
Expo separately with `Ctrl+C` in their terminals.

## Database commands

Run these from the repository root:

```powershell
# Start MySQL, migrate and seed, without starting API/web.
python api/scripts/setup_demo.py --database-only

# Start the stack with schema setup only; do not insert demo data.
python api/scripts/setup_demo.py --schema-only

# Check schema compatibility without changing the schema (MySQL must be running).
python api/scripts/migrate_schema.py --check

# Validate existing demo records without inserting data (MySQL must be running).
python api/scripts/seed_demo.py --validate-only
```

Demo readings, alerts, danger zones and shelters are illustrative data, not
operational safety information. See [demo seed and migrations](api/scripts/DEMO-DATA.md)
and [Victoria Dam demo geography](api/scripts/VICTORIA-DEMO.md).

## Troubleshooting

- **Docker connection error:** start Docker Desktop, wait for the engine, and rerun setup.
- **Port already in use:** stop the conflicting service. DDAS uses 80 (web),
  8080 (API), 8081 (phpMyAdmin), 3307 (MySQL), 5173 (Vite), and 8082 (Expo preview).
- **API schema validation failure:** rerun setup so migrations run before API startup.
  If migration fails, read its error and inspect the database logs; do not remove
  the database volume as a workaround.
- **MySQL access denied:** ensure `api/.env` matches the existing volume's credentials.
- **Web talks to another server:** set the local API URL as shown above and restart
  Vite. Docker web uses its own build configuration.
- **Mobile health check fails:** verify `http://localhost:8080/actuator/health`
  first; start the Docker services before the mobile preview.
- **Expo Go cannot open the app:** use a version supporting SDK 57, then rerun
  `mobile:tunnel` and scan its new QR code.

## Project folders

| Folder | Purpose |
| --- | --- |
| `api/` | Spring Boot API, Docker Compose, database migrations and seed scripts |
| `web/` | React/Vite management dashboard with a shared Material theme |
| `app/` | Expo/React Native mobile application |
| `ai/` | FastAPI AI service managed with uv, with service authentication and a Spring Boot data client |

Further documentation: [API guide](api/README.md),
[API request collection](api/bruno/README.md), and
[web UI guide](web/MATERIAL-UI.md), and
[AI backend setup](ai/README.md).
