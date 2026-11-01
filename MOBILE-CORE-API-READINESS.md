# Local mobile core API readiness — 1 November 2026

> Historical audit. See [the current local setup report](api/MOBILE-API-REPORT.md) for the host-run Spring Boot configuration and new Bruno results.

## Verdict

Core service contracts are prepared in source. Local login, user profile and dam data were verified with an existing local demo account. The running API container is outdated: forecast, overflow configuration and AI chat routes are absent from that runtime. These features are not yet verified end to end. No production changes were made.

Scope: dams, status, sensors/readings, gates, user details, forecasts and AI assistance. Reports, news, notifications, routing and emergency locations are excluded.

## Verified local runtime

Target: http://localhost:8080/api/v1. Existing local demo credentials were used without printing tokens or passwords. No profile/password changes were submitted.

| Feature | Route relative to base URL | Observed |
| --- | --- | --- |
| Health | GET /health | 200 |
| Login | POST /auth/login | Success; bearer token received |
| Current user | GET /users/me | 200; ApiResponse envelope |
| Active dams | GET /dams/active | Success; 3 records |
| Dam details | GET /dams/2 | 200 |
| Dam status | GET /dams/2/status | 200 |
| Dam gates | GET /dams/2/gates | 200 |
| Sensors | GET /sensors/dam/2 | 200 |
| Latest readings | GET /sensors/dam/2/readings/latest | 200 |
| Latest forecasts | GET /dams/2/forecasts | 500; running API has no route |
| Forecast history | GET /dams/2/forecast-history?limit=2 | 500; running API has no route |
| Overflow settings | GET /dams/2/overflow-config | 500; running API has no route |
| AI chat | POST /ai/chat | 500; running API has no route |
| AI readiness | http://localhost:8000/health/ready | Could not connect |

Dam 2 is a local demo record. Successful responses do not establish the accuracy or freshness of real-world telemetry. An initial inspection command failed to select a dam ID correctly; the dam requests above were rerun with the valid ID 2.

## Changes completed

- Added mobile endpoint constants and services for latest forecasts, cursor-based forecast history and overflow configuration.
- Added AI chat service using query and optional dam_id; client timeout is 75 seconds to allow the backend's 60-second upstream wait.
- Added forecast types including uncertainty bounds, overflow probability, publication, freshness and demo indicators. Consumers must display stale/demo status and handle an empty forecast list.
- Corrected registration payload to fullName, with optional phoneNumber/languagePreference.
- Corrected profile fields to fullName, phoneNumber, avatarUrl, languagePreference and notificationEnabled. Profile updates do not support email changes in the inspected backend.
- Added the required confirmPassword field to password updates.
- AI chat rejects missing, blank and non-string queries with 400 before calling the AI service.
- Connected the local Compose API configuration to http://ai:8000 and supplied both AI service-token environment variables. Previously the API defaulted to its own localhost and received neither token from Compose.
- Existing local mobile environment remains configured for the Expo development proxy to this computer's API. No production address was selected.

## Source API contract

All core data routes require a logged-in bearer token. Do not place AI service tokens in the mobile app.

| Capability | Request | Response / notes |
| --- | --- | --- |
| Register | POST /auth/register | fullName, email, password; optional phoneNumber/languagePreference |
| Login | POST /auth/login | email/password; token at data.token |
| User details | GET /users/me | user at data; includes fullName, email, role, language and location fields |
| Update profile | PUT /users/me | supported fields listed above; result at data |
| Change password | PUT /users/me/password | currentPassword, newPassword, confirmPassword |
| Save user location | PUT /users/me/location | latitude, longitude |
| Dam list/detail | GET /dams/active, /dams/{id} | existing mobile dam service |
| Status/gates | GET /dams/{id}/status, /dams/{id}/gates | existing mobile services |
| Sensors/history | GET /sensors/dam/{id}, /sensors/{id}/readings, /sensors/{id}/readings/range | existing mobile sensor service |
| Latest published forecasts | GET /dams/{id}/forecasts | ApiResponse.data is an array; empty is possible |
| Forecast history | GET /dams/{id}/forecast-history | optional from/to ISO dates with offset, cursor, limit; rows at data.data; cursor at data.nextCursor |
| Overflow configuration | GET /dams/{id}/overflow-config | result at data |
| AI assistance | POST /ai/chat | query, optional dam_id; result at data, including answer/sources |

Forecast history reuses the backend export query and can contain unpublished runs; the latest endpoint selects published runs. The consumer must not treat every historical row as a published prediction. AI source availability, language-model credentials, indexed documents and current forecast releases still require runtime verification.

## Validation

- Focused backend checks: 24 tests passed, zero failures/errors (AI chat controller, dam/forecast controller, forecast service and internal data controller).
- Added coverage for rejecting invalid AI queries and preserving forecast freshness, demo status, uncertainty bounds and probability in the mobile response.
- Mobile TypeScript check passed.
- Full mobile lint failed with 18 errors and 15 warnings in existing UI files, including News and emergency components outside this scope. These files were not changed.
- Authenticated local read checks listed above passed for user/dam data. They used the older running container, not the newly compiled source.
- Registration, profile/password writes, device behavior and AI answers were not verified. Mobile services were added; new forecast/AI screens were not built.

## Remaining local startup work

1. Rebuild/recreate the API from current source. The current container predates the forecast/AI controllers.
2. Ensure the local database has the current schema before starting the rebuilt API; Compose uses Hibernate validate. Do not reset the database to solve schema errors.
3. Configure two distinct service tokens of at least 32 characters in api/.env; Compose supplies them to both services. Never commit the values.
4. Build/start the ai service and its required dependencies from api/docker-compose.yml. The API now uses the internal ai hostname; a host-run AI process alone will not satisfy that container URL.
5. Verify AI readiness, published forecast data/model release and indexed documents. Repeat authenticated forecast and AI calls, then test mobile on a device.

No containers were rebuilt/restarted and no database migrations were applied in this pass. Source readiness is established by compilation/tests; complete local runtime readiness remains pending the startup work above.
