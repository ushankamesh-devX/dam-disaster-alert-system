# API contract

## Implemented FastAPI routes

| Method/path | Auth | Behavior |
| --- | --- | --- |
| `GET /health/live` | Public | Process liveness. |
| `GET /health/ready` | Public | Incoming auth configured + authenticated Spring dam-list read; otherwise 503. |
| `GET /internal/service/status` | Service bearer | App version and active subsystem status. |
| `GET /internal/data/dams` | Service bearer | Reads dam list through the dedicated Spring API. |
| `GET /v1/dams/{id}/forecast-summary` | Public | Published saved summary only; no inference trigger. |
| `POST /internal/forecasts/predict` | Service | Read DB-backed inputs; return level bounds + overflow probability for 1/3/6 hours. |
| `GET /internal/dams/{id}/forecast-history` | Service | Detailed forecast history/evaluation via Spring persistence. |
| `POST /internal/ml/jobs` | Service | Queue train/forecast/evaluate; 202 + job ID. |
| `GET /internal/ml/jobs/{id}` | Service | Durable status/progress/result/failure. |
| `GET /internal/ml/releases` | Service | MLflow release metadata and evaluation. |
| `GET /internal/ml/active-release` | Service | Actually loaded model/config versions. |
| `PUT /internal/ml/active-release` | Deployment service | Validate/load both models; activate or roll back atomically. |
| `GET /internal/ml/monitoring` | Service | Freshness, job failures, level error, probability performance. |
| `POST /internal/rag/documents` | Service | Index operational manual or SOP with versioning. |
| `GET /internal/rag/documents` | Service | List indexed operational documents with filters. |
| `DELETE /internal/rag/documents/{id}` | Service | Soft delete/deactivate document from RAG retrieval. |
| `POST /internal/rag/chat` | Service | Contextual grounded RAG chat over active manuals with citations. |

- Swagger/OpenAPI public only with `DDAS_AI_ENABLE_DOCS=true`; disable on deployment.
- Other routes require auth by default; missing/invalid token: 401; unconfigured auth/upstream: 503.

## Spring stored-data APIs (implemented)

Prefix: `/api/v1/internal/ml`. All require `fastapi-service` + `ml.data.read`.

| Method/path | Behavior |
| --- | --- |
| `GET /dams` | ML-enabled dam metadata. |
| `GET /dams/{id}/sensors` | Sensor type, unit, role/location, reference level, quality configuration. |
| `GET /dams/{id}/readings` | Stored readings; `from`, `to`, `cursor`; fixed export cutoff. |
| `GET /dams/{id}/status` | Latest stored status. |
| `GET /dams/{id}/status-history` | Timestamped status/gate snapshots; `from`, `to`, `cursor`. |
| `GET /dams/{id}/overflow-config` | Verified threshold/definition, effective time, version. |
| `GET /dams/{id}/forecasts` | Latest or paginated saved history (`from`, `to`, `cursor`); publication state, versions. |
| `GET /dams/{id}/weather` | Stored weather/archived forecasts; `from`, `to`, `asOf`, `cursor`. |

- FastAPI/worker use these APIs; no direct MySQL connection or device ingestion.
- Different tokens per service direction; normal user JWTs/device keys cannot access these read APIs.
- UTC bounds, stable pagination, demo/real distinction, availability metadata; no fallback to general sensor routes.

## Spring dashboard, ML admin, and AI RAG routes (implemented)

Prefix: `/api/v1`. JWT for viewing; explicit permissions for management.

| Method/path | Behavior |
| --- | --- |
| `GET /dams/{id}/forecasts`, `GET /dams/{id}/forecast-history` | Latest saved results / paginated history. |
| `GET /dams/{id}/overflow-config`, `PUT /dams/{id}/overflow-config` | Read / create effective-dated configuration version. |
| `POST /admin/ml/jobs`, `GET /admin/ml/jobs/{id}` | Permission-checked job request / polling. |
| `GET /admin/ml/releases`, `GET /admin/ml/active-release`, `PUT /admin/ml/active-release` | Inspect releases / inspect or change active release. |
| `GET /admin/ml/monitoring` | Permission-checked monitoring. |
| `POST /ai/chat` | Authenticated RAG chat proxy with dam scoping. |
| `POST /admin/ai/documents`, `GET /admin/ai/documents`, `DELETE /admin/ai/documents/{id}` | Admin document management & indexing proxy. |

Spring checks permissions, schedules/polls jobs, saves forecasts, and proxies RAG inquiries; MLflow owns run/model metadata.
Reuse existing `/api/v1/auth/login`, dam/status/sensor views, device ingestion, and operator alert creation.
