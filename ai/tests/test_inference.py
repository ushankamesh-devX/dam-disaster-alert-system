import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.common.config import Settings
from app.forecasting.inference import build_inference_features, predict_forecast
from app.forecasting.models import (
    OverflowProbabilityModel,
    WaterLevelMultiQuantileModel,
)
from app.forecasting.registry import ModelReleaseRegistry, ReleaseMetadata
from app.main import create_app

INCOMING_TOKEN = "test-only-incoming-service-token-00000001"
OUTGOING_TOKEN = "test-only-spring-service-token-000000002"


def setup_mock_release(tmp_path: Path, release_id: str = "rel_test_infer_01") -> ReleaseMetadata:
    """Creates a mock release with trained dummy models in tmp_path."""
    rel_dir = tmp_path / "releases" / release_id
    models_dir = rel_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    features = [
        "water_level",
        "lag_1h",
        "lag_2h",
        "lag_3h",
        "lag_6h",
        "level_rise_rate_1h",
        "level_rolling_mean_3h",
        "net_inflow",
        "calendar_hour",
        "calendar_hour_sin",
        "calendar_hour_cos",
        "calendar_dayofweek",
        "calendar_dayofweek_sin",
        "calendar_dayofweek_cos",
        "calendar_month",
        "calendar_month_sin",
        "weather_forecast_1h",
        "weather_forecast_3h",
        "weather_forecast_6h",
    ]

    np.random.seed(42)
    dummy_X = pd.DataFrame(np.random.normal(10.0, 2.0, (25, len(features))), columns=features)
    dummy_y = pd.Series([100.0 + i * 0.5 + np.random.normal(0, 0.1) for i in range(25)])

    for h in (1, 3, 6):
        lvl = WaterLevelMultiQuantileModel(h, iterations=5)
        lvl.fit(dummy_X, dummy_y)
        lvl.save(models_dir / f"level_{h}h.joblib")

        ovf = OverflowProbabilityModel(h, iterations=5)
        ovf.feature_names = features
        ovf.is_operational = True
        ovf.save(models_dir / f"overflow_{h}h.joblib")

    meta = ReleaseMetadata(
        release_id=release_id,
        created_at="2026-10-24T12:00:00Z",
        status="active",
        dataset_version="v1.0",
        dataset_sha256="abc",
        git_commit="test-commit",
        feature_names=features,
        horizons_hours=[1, 3, 6],
        passed_gates=True,
        evaluation_summary={},
    )
    with (rel_dir / "metadata.json").open("w", encoding="utf-8") as f:
        json.dump(meta.to_dict(), f)

    # Set active release pointer
    pointer = {"active_release_id": release_id, "previous_release_id": None}
    with (tmp_path / "active_release.json").open("w", encoding="utf-8") as f:
        json.dump(pointer, f)

    return meta


def mock_spring_handler(request: httpx.Request) -> httpx.Response:
    url = str(request.url)
    if "dams/1/overflow-config" in url:
        return httpx.Response(
            200,
            json={
                "id": 1,
                "damId": 1,
                "crestLevelMeters": 105.5,
                "version": 1,
                "verified": True,
            },
        )
    if "dams/1/readings" in url:
        now = datetime(2026, 10, 24, 12, 0, tzinfo=UTC)
        readings = []
        for i in range(10):
            ts = (now - timedelta(hours=i)).isoformat()
            readings.extend(
                [
                    {"sensorType": "WATER_LEVEL", "value": 100.0 - i * 0.1, "recordedAt": ts},
                    {"sensorType": "RAINFALL_RATE", "value": 2.5, "recordedAt": ts},
                    {"sensorType": "INFLOW_RATE", "value": 15.0, "recordedAt": ts},
                    {"sensorType": "OUTFLOW_RATE", "value": 10.0, "recordedAt": ts},
                ]
            )
        return httpx.Response(200, json={"data": readings, "nextCursor": None})
    if "dams/1/weather" in url:
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": 1,
                        "forecastRainfall1hMm": 2.0,
                        "forecastRainfall3hMm": 5.0,
                        "forecastRainfall6hMm": 10.0,
                    }
                ],
                "nextCursor": None,
            },
        )
    if "dams/1/forecasts" in url:
        return httpx.Response(
            200,
            json={
                "data": [
                    {"horizonHours": 1, "levelP50": 102.0, "overflowProbability": 0.05},
                    {"horizonHours": 3, "levelP50": 102.5, "overflowProbability": 0.08},
                    {"horizonHours": 6, "levelP50": 103.0, "overflowProbability": 0.12},
                ],
                "nextCursor": None,
            },
        )
    return httpx.Response(404, json={"detail": "Not found"})


@pytest.mark.anyio
async def test_build_inference_features_and_freshness():
    transport = httpx.MockTransport(mock_spring_handler)
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
    )

    async with httpx.AsyncClient(
        base_url="http://127.0.0.1:8080/api/v1/internal/ml/",
        transport=transport,
    ) as http_client:
        from app.common.spring_data import SpringDataClient

        spring_client = SpringDataClient(http_client, config)
        as_of = datetime(2026, 10, 24, 12, 0, tzinfo=UTC)
        expected_features = ["water_level", "lag_1h", "net_inflow", "calendar_hour"]

        X_infer, freshness, latest_ts, threshold, version = await build_inference_features(
            dam_id=1,
            as_of=as_of,
            client=spring_client,
            expected_features=expected_features,
        )

        assert not X_infer.empty
        assert set(X_infer.columns) == set(expected_features)
        assert freshness == "fresh"
        assert latest_ts is not None
        assert threshold == 105.5
        assert version == 1


@pytest.mark.anyio
async def test_predict_forecast_end_to_end(tmp_path):
    setup_mock_release(tmp_path)
    registry = ModelReleaseRegistry(tmp_path)

    transport = httpx.MockTransport(mock_spring_handler)
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    async with httpx.AsyncClient(
        base_url="http://127.0.0.1:8080/api/v1/internal/ml/",
        transport=transport,
    ) as http_client:
        from app.common.spring_data import SpringDataClient

        spring_client = SpringDataClient(http_client, config)
        as_of = datetime(2026, 10, 24, 12, 0, tzinfo=UTC)

        result = await predict_forecast(
            dam_id=1,
            as_of=as_of,
            demo_mode=False,
            registry=registry,
            client=spring_client,
        )

        assert result.dam_id == 1
        assert result.freshness == "fresh"
        assert result.overflow_threshold_meters == 105.5
        assert len(result.horizons) == 3

        h1 = result.horizons[0]
        assert h1.horizon_hours == 1
        assert h1.level_p10 <= h1.level_p50 <= h1.level_p90


def test_forecast_predict_api_endpoint(tmp_path):
    setup_mock_release(tmp_path)
    transport = httpx.MockTransport(mock_spring_handler)
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    app = create_app(config, spring_transport=transport)
    with TestClient(app) as client:
        # 1. Unauthenticated prediction fails
        unauth_resp = client.post("/internal/forecasts/predict", json={"dam_id": 1})
        assert unauth_resp.status_code == 401

        # 2. Authenticated prediction succeeds with explicit as_of
        auth_header = {"Authorization": f"Bearer {INCOMING_TOKEN}"}
        resp = client.post(
            "/internal/forecasts/predict",
            headers=auth_header,
            json={"dam_id": 1, "as_of": "2026-10-24T12:00:00Z", "demo_mode": False},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dam_id"] == 1
        assert data["freshness"] == "fresh"
        assert len(data["horizons"]) == 3
        assert data["horizons"][0]["horizon_hours"] == 1

        # 3. Request without as_of identifies historical mock data as stale
        stale_resp = client.post(
            "/internal/forecasts/predict",
            headers=auth_header,
            json={"dam_id": 1},
        )
        assert stale_resp.status_code == 200
        assert stale_resp.json()["freshness"] == "stale"

        # 4. Public summary endpoint accessible without auth
        summary_resp = client.get("/v1/dams/1/forecast-summary")
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()
        assert "data" in summary_data
        assert len(summary_data["data"]) == 3
