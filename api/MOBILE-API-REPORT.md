# Mobile API and local development report

Date: 1 November 2026. This supersedes the earlier root-level API audits.

## Local architecture

| Component | Runs in | Address |
| --- | --- | --- |
| Spring Boot | Host JVM through Maven | http://localhost:8080/api/v1 |
| MySQL | Existing Docker service/volume | localhost:3306 |
| MQTT | Docker | localhost:1883 |
| AI/FastAPI | Docker | localhost:8000 |
| Qdrant | Docker | localhost:6333 |
| MinIO | Docker | localhost:9000; console 9090 |
| MLflow | Docker | localhost:5000 |

`scripts/start-local.ps1` starts dependencies using `docker-compose.yml` plus `docker-compose.host.yml`, stops the old API/web containers, and runs Spring Boot on the host. Existing data volumes are retained. No database reset or schema migration was performed during this switch; Hibernate schema validation passed against the existing local database.

Spring reads `api/.env` when started from `api/`. Default database/MQTT addresses now use localhost rather than a remote server or a container-only hostname. Explicit environment overrides still work for container/production deployments. The AI container calls Spring through `host.docker.internal:8080`; tokens are supplied from `api/.env`. Optional provider settings are loaded from `ai/.env`. AI artifacts have a writable, persistent Docker volume.

## Start and use

From `api/`:

```powershell
.\scripts\start-local.ps1
```

If Docker dependencies are already running:

```powershell
.\scripts\start-local.ps1 -SkipDocker
# Or, from api/ after configuring .env:
.\mvnw.cmd spring-boot:run
```

Use `-DependenciesOnly` to start only Docker services. Keep the Spring terminal running. The old full-container workflow remains available with the base Compose file. The container web dashboard is stopped in the host workflow; use your frontend development server if needed.

## Mobile API coverage

| Feature | Routes relative to /api/v1 | Status |
| --- | --- | --- |
| Login/current user | POST /auth/login; GET /users/me | Verified locally |
| Register/profile/password/location | POST /auth/register; PUT /users/me, /users/me/password, /users/me/location | Contracts corrected; manual Bruno requests supplied |
| Dam lists and details | GET /dams, /dams/active, /dams/{id}, search, region | Verified locally |
| Dam status/gates | GET /dams/{id}/status, /dams/statuses, high-risk, gates/open gates | Verified locally |
| Hazard/regions | GET /hazard-levels/active, /dams/{id}/hazard-zones/active, /regions/list | Verified locally |
| Sensors/latest readings | GET /sensors/dam/{id}, active sensors, sensor details, latest readings | Verified locally |
| Sensor history/statistics | Paginated readings, date range, sensor/dam statistics | Verified locally |
| Published forecasts/history | GET /dams/{id}/forecasts, /forecast-history | Verified locally; empty stored results |
| Overflow configuration | GET /dams/{id}/overflow-config | Verified locally |
| AI assistant | POST /ai/chat | Verified through host Spring Boot and Docker AI; HTTP 200 |

All protected calls use the logged-in user's bearer token. Internal AI service tokens do not belong in the mobile app or Bruno collection. Reports, news, notifications, routing and emergency locations are excluded from this release scope.

## Changes

- Added `bruno-mobile`: a dedicated 33-request collection, separate from the older admin/general collection.
- Added mobile forecast/history and AI services plus overflow endpoint access.
- Corrected registration/profile field names and required password confirmation.
- Corrected sensor range/statistics parameters to required `startTime` and `endTime`.
- AI query validation returns 400 for absent, blank or non-string queries.
- Added host-run Spring/Docker dependency launcher and Compose overlay; AI artifact directory is owned by its non-root runtime user.

## Validation

- **Bruno CLI 4.3.0:** final run passed 29 requests and 36 tests, including AI, against host Spring Boot using the existing local demo account. Credentials and tokens were not written into tracked files. The core-only run also passed 28 requests and 34 tests.
- **Backend:** full Maven suite passed — 57 tests, zero failures/errors, including application context loading against local MySQL.
- **Mobile:** final TypeScript check and lint for all changed API services passed, including the sensor date-range/statistics signatures.
- Compose configuration and PowerShell launcher syntax checks passed; the overlay's enabled services omit the API/web containers and remove AI's dependency on a container API.
- Manual registration/profile/location/password writes were not executed against the existing account. Their payloads match backend DTOs; writes are disabled unless `allowWrites=true` in Bruno.
- Blank AI query was rejected with HTTP 400 by the running host API.
- Bruno's profile-update request was run with writes disabled and was skipped by the collection pre-request guard; it sent no update.
- The existing whole-app lint issues reported in the earlier audit are outside this API change.

## Data and product limits

- Latest forecast endpoints return an empty array when no published model results are stored. Working endpoints do not establish that model training/publication and scheduled generation are ready.
- History can include unpublished runs. Consumers must inspect publication/freshness/demo indicators; uncertainty and probability fields remain available.
- AI needs reachable dependencies, valid provider settings and indexed documents for grounded answers. A successful fallback response is not proof of populated knowledge or forecast releases.
- New mobile screens and end-to-end device flows were not built/tested. This work supplies the API contracts/services and a verified local API workflow.
- Mobile now supports personal login/registration, manual dam onboarding and secure native token storage. See `../app/AUTH-ONBOARDING.md` for the newer implementation and checks; the shared-viewer fallback is removed.

## AI and final-check results

- AI Docker image built and the service started successfully. An initial readiness call during startup returned an empty reply; after startup, `/health/ready` returned HTTP 200 with `status: ready`.
- Readiness verified the AI container can call the host Spring internal API using its configured service token.
- The Bruno AI request completed through Spring in approximately 16 seconds with HTTP 200, a string answer and a sources array. This verifies the request/response path, not the factual quality or completeness of its answer.
- Full final collection result: **29 requests passed, 36 tests passed**. Four manual account-write requests remain gated and were not submitted.
- Final mobile TypeScript and changed-service lint checks passed. Full Maven suite: **57 tests passed**.
- Spring Boot is running as a host Java process. The old API/web containers are stopped; MySQL, MQTT, AI, Qdrant, MinIO, MLflow and phpMyAdmin remain in Docker.
- No production server changes were made. No new forecast model was trained/published and no documents were fabricated to make the checks pass.
