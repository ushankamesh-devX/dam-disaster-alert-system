# Implementation plan

## Decisions

- Separate FastAPI backend; uv dependencies; Uvicorn server.
- Predict water level after 1/3/6 hours, with uncertainty bounds.
- Predict overflow-threshold exceedance at any point within each horizon.
- Overflow threshold must be verified; danger/full levels are not substitutes.
- FastAPI and its worker read stored data through dedicated Spring APIs only.
- Spring owns MySQL, sensor ingestion, user permissions, weather collection, and forecast persistence.
- Public access: health and published forecast summaries; internal operations require service auth.
- Separate forecasting and future RAG modules in the same backend.

## Workflow

```text
Stored data APIs -> validated dataset -> features/targets -> training/evaluation
-> MLflow release -> activation -> scheduled inference -> Spring saves forecasts
-> monitoring against later readings -> candidate retraining
```

- Shared training/inference features; chronological validation; horizon gap; separate calibration data.
- Gate releases on level error, interval coverage, missed overflows, false alarms, and calibration.
- MLflow: run tracking, model registry, SQLite metadata, persistent artifacts initially.
- Record Git commit, uv.lock, immutable dataset snapshots/checksums, feature/threshold versions, models.
- One release links both models and compatible configuration; activate together; retain rollback release.
- Start hourly forecasts; weekly candidate retraining when enough new data exists.
- Durable job states; no overlapping jobs; idempotent forecast writes; failed training keeps active release.
- Forecasts carry release/config versions, input timestamps, demo/real mode, freshness, availability reason.
- Missing probability is `null`; insufficient events block classifier promotion.
- Operator reviews forecasts before issuing alerts; RAG follows ML integration.

## Planned runtime and scheduling

- `ai` container: FastAPI/Uvicorn; multi-horizon inference, internal job APIs, and grounded SOP RAG.
- `qdrant` container: Qdrant Vector Database (`ddas_rag_documents` collection with dam payload filtering).
- `minio` container: MinIO S3-compatible Object Storage (`ddas-artifacts` bucket for documents and model releases).
- `mysql` container: Spring Boot relational database for tabular telemetry and forecast persistence.
- Spring `@Scheduled` cron expressions trigger jobs; separate OS cron service is unnecessary initially.
- Initial cadence: hourly weather/forecasts/evaluation; weekly candidate training if data is sufficient.
- Scheduler submits/polls jobs; worker does heavy work; Spring saves forecasts.
- One scheduler instance; durable job IDs and overlap protection; schedules use explicit timezones.
- Docker Compose services configured in `api/docker-compose.yml`.
- References: [Qdrant](https://qdrant.tech/documentation/), [MinIO](https://min.io/docs/minio/linux/index.html).

## Planned models (not trained)

| Purpose | Initial candidate | Baseline |
| --- | --- | --- |
| Water level + bounds | CatBoostRegressor; MultiQuantile P10/P50/P90 | Last observed level |
| Overflow probability | CatBoostClassifier + sigmoid calibration | Logistic regression / historical event frequency |

- One model pair per 1/3/6-hour horizon; pool compatible dam data; one versioned release.
- Inputs: sensor/weather history, lags, calendar, dam metadata; evaluate per dam and horizon.
- P50 is the central water-level estimate; P10/P90 are the lower/upper bounds.
- P10–P90 is a nominal 80% interval; measure actual coverage and check quantile ordering.
- Fit sigmoid calibration on a later, separate period at real event prevalence; both classes in each split.
- Optional comparison: scikit-learn histogram boosting; choose winners on chronological real-data checks.
- Synthetic data validates the pipeline; verified overflow labels/events are required for operational probability.
- Sources: [CatBoost quantiles](https://catboost.ai/docs/en/concepts/loss-functions-regression), [calibration](https://scikit-learn.org/stable/modules/calibration.html).

## Order

1. [x] Implement Spring service identity and stored-data APIs.
2. [x] Add sensor roles/reference levels, verified overflow configuration, and status history.
3. [x] Collect and archive weather; prepare versioned datasets and features.
4. [x] Train baselines/candidates; evaluate; register and activate compatible releases.
5. [x] Add scheduled inference, saved forecasts, and dashboard endpoints.
6. [x] Add monitoring, candidate retraining, and rollback controls.
7. [x] Add authenticated RAG and document versioning.

Current: Completed all Phases 1-7. System includes FastAPI ML & RAG backend, Spring ML stored-data APIs, sensor roles/reference levels, verified overflow configuration, status history, weather archiving, versioned datasets, feature engineering, baselines, CatBoost MultiQuantile (P10/P50/P90) & Sigmoid-calibrated models, release evaluator/gates, MLflow tracking, atomic model release registry & rollback, multi-horizon inference (1h, 3h, 6h), Spring forecast persistence (dam_forecasts), dashboard endpoints, durable job queue, candidate retraining, monitoring engine, and versioned document management with TF-IDF cosine grounded operational SOP RAG chat. Detailed data/API contracts: [Data](DATA.md), [APIs](API.md).
