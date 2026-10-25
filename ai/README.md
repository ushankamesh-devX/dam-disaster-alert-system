# DDAS AI backend

FastAPI + Uvicorn; uv dependency management; Python 3.12; app version `0.1.0`.

- Implemented: health checks, service authentication, Spring data client, Spring ML data APIs, sensor roles/reference levels, overflow configuration, status history, weather archiving, dataset snapshots, feature engineering, baselines & CatBoost MultiQuantile/Calibrated models, evaluation gates, MLflow release registry & rollback, scheduled inference, saved forecasts, dashboard endpoints, durable job queue, candidate retraining, monitoring, authenticated RAG with Qdrant vector database and MinIO object storage.
- Status: All Phases 1 through 7 completed and verified with comprehensive unit test coverage across FastAPI and Spring Boot.
- Storage & Retrieval: Qdrant vector database (`ddas_rag_documents`), MinIO S3-compatible storage (`ddas-artifacts`), MySQL 8.0 for tabular telemetry.
- Docs: [Plan](docs/PLAN.md), [Data](docs/DATA.md), [APIs](docs/API.md).
- Keep docs short: necessary points, endpoint tables, and current status only.

## Run

From `ai/`, with uv installed:

```powershell
uv sync --locked
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- Local uv fallback: `$env:Path = "$PWD\.tools\Scripts;$env:Path"`.
- Restricted cache: set `UV_CACHE_DIR=$PWD\.uv-cache`, `UV_PYTHON_INSTALL_DIR=$PWD\.uv-python`.
- Health: http://127.0.0.1:8000/health/live
- Swagger: http://127.0.0.1:8000/docs when `DDAS_AI_ENABLE_DOCS=true`.
- Configure two different service tokens in `.env`; minimum 32 characters each.
- Spring data URL: `DDAS_AI_SPRING_DATA_BASE_URL`; dedicated prefix `/api/v1/internal/ml`.
- Readiness stays `503` until tokens and the Spring data API are configured.
- Disable public docs on deployment. Keep secrets and artifacts out of Git.

## Checks

```powershell
uv run --locked pytest
uv run --locked ruff check .
uv run --locked ruff format --check .
```

## Docker

```powershell
docker build -t ddas-ai .
docker run --rm --env-file .env -p 127.0.0.1:8000:8000 ddas-ai
```

Use Spring hostname `api` on its Compose network, or `host.docker.internal` for a host API.
Existing Compose integration is pending.
