import json
from datetime import UTC, datetime, timedelta

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.common.config import Settings
from app.forecasting.baselines import (
    OverflowFrequencyBaseline,
    WaterLevelPersistenceBaseline,
)
from app.forecasting.evaluator import (
    evaluate_level_forecasts,
    evaluate_overflow_forecasts,
)
from app.forecasting.models import (
    OverflowProbabilityModel,
    WaterLevelMultiQuantileModel,
)
from app.forecasting.registry import ModelReleaseRegistry, ReleaseMetadata
from app.forecasting.training import train_and_evaluate_release
from app.main import create_app

INCOMING_TOKEN = "test-only-incoming-service-token-00000001"
OUTGOING_TOKEN = "test-only-spring-service-token-000000002"


def make_synthetic_dataset(n_samples: int = 150) -> pd.DataFrame:
    """Generates synthetic dam readings with features and targets."""
    start_dt = datetime(2026, 10, 1, 0, 0, tzinfo=UTC)
    timestamps = [start_dt + timedelta(hours=i) for i in range(n_samples)]
    base_level = 100.0 + np.sin(np.linspace(0, 10, n_samples)) * 5.0

    df = pd.DataFrame(
        {
            "timestamp": timestamps,
            "dam_id": 1,
            "water_level": base_level,
            "lag_1h": np.roll(base_level, 1),
            "lag_3h": np.roll(base_level, 3),
            "calendar_hour": [t.hour for t in timestamps],
            "calendar_dayofweek": [t.weekday() for t in timestamps],
            "rainfall_rate": np.abs(np.random.normal(2.0, 1.0, n_samples)),
            "net_inflow": np.random.normal(5.0, 2.0, n_samples),
        }
    )
    # Add targets
    for h in (1, 3, 6):
        df[f"target_level_{h}h"] = df["water_level"].shift(-h).bfill()
        df[f"target_overflow_{h}h"] = (df[f"target_level_{h}h"] > 103.5).astype(float)
    return df


def test_water_level_persistence_baseline():
    df_train = pd.DataFrame({"water_level": [10.0, 10.5, 11.0, 11.5, 12.0]})
    target_train = pd.Series([10.2, 10.7, 11.1, 11.8, 12.1])

    baseline = WaterLevelPersistenceBaseline(level_col="water_level")
    assert not baseline.is_fitted

    # Unfitted prediction
    preds_unfitted = baseline.predict(df_train)
    assert np.allclose(preds_unfitted["p10"], preds_unfitted["p50"])
    assert np.allclose(preds_unfitted["p50"], preds_unfitted["p90"])

    # Fitted prediction
    baseline.fit(df_train, target_train)
    assert baseline.is_fitted
    assert baseline.residual_sigma > 0

    df_test = pd.DataFrame({"water_level": [15.0, 16.0]})
    preds_fitted = baseline.predict(df_test)
    assert (preds_fitted["p10"] < preds_fitted["p50"]).all()
    assert (preds_fitted["p50"] < preds_fitted["p90"]).all()
    assert np.allclose(preds_fitted["p50"], [15.0, 16.0])


def test_overflow_frequency_baseline():
    target = pd.Series([0, 0, 0, 1, 0, 1, 0, 0, 0, 0])  # 2 out of 10
    baseline = OverflowFrequencyBaseline().fit(target)
    assert baseline.is_fitted
    assert pytest.approx(baseline.base_rate, 0.001) == 0.2

    proba = baseline.predict_proba(5)
    assert len(proba) == 5
    assert np.allclose(proba, 0.2)


def test_water_level_multiquantile_catboost_monotonicity(tmp_path):
    df = make_synthetic_dataset(120)
    features = ["water_level", "lag_1h", "lag_3h", "calendar_hour", "net_inflow"]
    y = df["target_level_1h"]

    model = WaterLevelMultiQuantileModel(horizon_hours=1, iterations=40)
    model.fit(df[features], y)

    preds = model.predict(df[features])
    assert set(preds.columns) == {"p10", "p50", "p90"}
    assert len(preds) == len(df)

    # Monotonicity check: P10 <= P50 <= P90
    assert (preds["p10"] <= preds["p50"]).all()
    assert (preds["p50"] <= preds["p90"]).all()

    # Save and load round-trip
    save_file = tmp_path / "level_1h.joblib"
    model.save(save_file)

    loaded = WaterLevelMultiQuantileModel.load(save_file)
    loaded_preds = loaded.predict(df[features])
    pd.testing.assert_frame_equal(preds, loaded_preds)


def test_overflow_probability_model_event_gating(tmp_path):
    df = make_synthetic_dataset(100)
    features = ["water_level", "lag_1h", "net_inflow"]

    # Case 1: Insufficient positive events (< 5)
    y_rare = pd.Series([0] * 98 + [1, 0])
    rare_model = OverflowProbabilityModel(horizon_hours=1, iterations=20)
    rare_model.fit(df[features], y_rare)
    assert not rare_model.is_operational
    assert "insufficient_historical_events" in (rare_model.non_operational_reason or "")
    assert rare_model.predict_proba(df[features]) is None

    # Case 2: Sufficient positive events (>= 5) with calibration split
    y_sufficient = pd.Series([0] * 80 + [1] * 20)
    y_calib = pd.Series([0] * 15 + [1] * 5)
    df_calib = df.iloc[:20][features]

    operational_model = OverflowProbabilityModel(horizon_hours=1, iterations=20)
    operational_model.fit(
        X_train=df[features],
        y_train=y_sufficient,
        X_calib=df_calib,
        y_calib=y_calib,
    )
    assert operational_model.is_operational
    proba = operational_model.predict_proba(df[features])
    assert proba is not None
    assert len(proba) == len(df)
    assert (proba >= 0.0).all() and (proba <= 1.0).all()

    # Save and load round-trip
    save_file = tmp_path / "overflow_1h.joblib"
    operational_model.save(save_file)
    loaded = OverflowProbabilityModel.load(save_file)
    assert loaded.is_operational
    loaded_proba = loaded.predict_proba(df[features])
    assert np.allclose(proba, loaded_proba)


def test_evaluator_level_and_overflow_gates():
    actual = pd.Series([10.0, 10.2, 10.5, 11.0, 10.8])
    cand_preds = pd.DataFrame(
        {
            "p10": [9.5, 9.8, 10.0, 10.5, 10.2],
            "p50": [10.0, 10.1, 10.4, 10.9, 10.7],
            "p90": [10.5, 10.6, 11.0, 11.5, 11.3],
        }
    )
    base_preds = pd.DataFrame(
        {
            "p10": [9.0, 9.0, 9.0, 9.0, 9.0],
            "p50": [9.8, 9.9, 10.0, 10.2, 10.3],
            "p90": [11.0, 11.0, 11.0, 11.0, 11.0],
        }
    )

    eval_result = evaluate_level_forecasts(1, actual, cand_preds, base_preds)
    assert eval_result.passed_gate
    assert eval_result.quantile_inversions == 0
    assert eval_result.mae < eval_result.baseline_mae

    # Overflow evaluation with non-operational model
    ovf_eval = evaluate_overflow_forecasts(
        horizon_hours=1,
        actual_series=pd.Series([0, 0, 0, 0, 1]),
        candidate_proba=None,
        baseline_proba=np.array([0.2] * 5),
        is_operational=False,
        non_operational_reason="insufficient_historical_events",
    )
    assert ovf_eval.passed_gate
    assert not ovf_eval.is_operational
    assert ovf_eval.reasons == ["insufficient_historical_events"]


def test_release_registry_activation_and_rollback(tmp_path):
    registry = ModelReleaseRegistry(tmp_path)
    assert registry.list_releases() == []
    assert registry.get_active_release() is None

    # Create dummy release 1
    rel1_dir = tmp_path / "releases" / "rel_20261024_01"
    models1_dir = rel1_dir / "models"
    models1_dir.mkdir(parents=True, exist_ok=True)

    for h in (1, 3, 6):
        lvl = WaterLevelMultiQuantileModel(h, iterations=5)
        lvl.feature_names = ["feat1"]
        lvl.save(models1_dir / f"level_{h}h.joblib")

        ovf = OverflowProbabilityModel(h, iterations=5)
        ovf.feature_names = ["feat1"]
        ovf.save(models1_dir / f"overflow_{h}h.joblib")

    meta1 = ReleaseMetadata(
        release_id="rel_20261024_01",
        created_at="2026-10-24T10:00:00Z",
        status="candidate",
        dataset_version="v1.0",
        dataset_sha256="abc",
        git_commit="test-commit-1",
        feature_names=["feat1"],
        horizons_hours=[1, 3, 6],
        passed_gates=True,
        evaluation_summary={},
    )
    with (rel1_dir / "metadata.json").open("w", encoding="utf-8") as f:
        json.dump(meta1.to_dict(), f)

    # Create dummy release 2
    rel2_dir = tmp_path / "releases" / "rel_20261024_02"
    models2_dir = rel2_dir / "models"
    models2_dir.mkdir(parents=True, exist_ok=True)
    for h in (1, 3, 6):
        lvl = WaterLevelMultiQuantileModel(h, iterations=5)
        lvl.feature_names = ["feat1"]
        lvl.save(models2_dir / f"level_{h}h.joblib")
        ovf = OverflowProbabilityModel(h, iterations=5)
        ovf.feature_names = ["feat1"]
        ovf.save(models2_dir / f"overflow_{h}h.joblib")

    meta2 = ReleaseMetadata(
        release_id="rel_20261024_02",
        created_at="2026-10-24T11:00:00Z",
        status="candidate",
        dataset_version="v2.0",
        dataset_sha256="def",
        git_commit="test-commit-2",
        feature_names=["feat1"],
        horizons_hours=[1, 3, 6],
        passed_gates=True,
        evaluation_summary={},
    )
    with (rel2_dir / "metadata.json").open("w", encoding="utf-8") as f:
        json.dump(meta2.to_dict(), f)

    releases = registry.list_releases()
    assert len(releases) == 2
    assert releases[0].release_id == "rel_20261024_02"

    # Activate release 1
    act1 = registry.activate_release("rel_20261024_01")
    assert act1.status == "active"
    assert registry.get_active_release_id() == "rel_20261024_01"

    # Activate release 2
    act2 = registry.activate_release("rel_20261024_02")
    assert act2.status == "active"
    assert registry.get_active_release_id() == "rel_20261024_02"

    # Rollback to release 1
    rolled = registry.rollback_release()
    assert rolled.release_id == "rel_20261024_01"
    assert registry.get_active_release_id() == "rel_20261024_01"


def test_end_to_end_train_and_evaluate_release(tmp_path):
    df = make_synthetic_dataset(160)
    feature_cols = [
        "water_level",
        "lag_1h",
        "lag_3h",
        "calendar_hour",
        "rainfall_rate",
        "net_inflow",
    ]

    release_meta = train_and_evaluate_release(
        df=df,
        feature_cols=feature_cols,
        artifacts_dir=tmp_path,
        dataset_version="v1.0",
        dataset_sha256="dummy-sha256",
        horizons_hours=(1, 3, 6),
        iterations=30,
        use_mlflow=False,
    )

    assert release_meta.release_id.startswith("rel_")
    assert release_meta.dataset_version == "v1.0"
    assert release_meta.horizons_hours == [1, 3, 6]

    # Verify files created on disk
    rel_dir = tmp_path / "releases" / release_meta.release_id
    assert (rel_dir / "metadata.json").exists()
    for h in (1, 3, 6):
        assert (rel_dir / "models" / f"level_{h}h.joblib").exists()
        assert (rel_dir / "models" / f"overflow_{h}h.joblib").exists()


def test_api_release_endpoints(tmp_path):
    # Setup app with temporary artifacts dir
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    # Populate a valid release in tmp_path
    rel_dir = tmp_path / "releases" / "rel_test_001"
    models_dir = rel_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    for h in (1, 3, 6):
        lvl = WaterLevelMultiQuantileModel(h, iterations=5)
        lvl.feature_names = ["feat1"]
        lvl.save(models_dir / f"level_{h}h.joblib")
        ovf = OverflowProbabilityModel(h, iterations=5)
        ovf.feature_names = ["feat1"]
        ovf.save(models_dir / f"overflow_{h}h.joblib")

    meta = ReleaseMetadata(
        release_id="rel_test_001",
        created_at="2026-10-24T12:00:00Z",
        status="candidate",
        dataset_version="v1.0",
        dataset_sha256="test-sha",
        git_commit="test-commit",
        feature_names=["feat1"],
        horizons_hours=[1, 3, 6],
        passed_gates=True,
        evaluation_summary={},
    )
    with (rel_dir / "metadata.json").open("w", encoding="utf-8") as f:
        json.dump(meta.to_dict(), f)

    app = create_app(config)
    with TestClient(app) as client:
        auth_header = {"Authorization": f"Bearer {INCOMING_TOKEN}"}

        # List releases
        resp = client.get("/internal/ml/releases", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["release_id"] == "rel_test_001"

        # Active release (initially 404)
        resp = client.get("/internal/ml/active-release", headers=auth_header)
        assert resp.status_code == 404

        # Service status shows not_implemented when no release active
        status_resp = client.get("/internal/service/status", headers=auth_header)
        assert status_resp.json()["features"]["forecasting"] == "not_implemented"
        assert status_resp.json()["active_release"] is None

        # Activate release
        act_resp = client.put(
            "/internal/ml/active-release",
            headers=auth_header,
            json={"release_id": "rel_test_001"},
        )
        assert act_resp.status_code == 200
        assert act_resp.json()["status"] == "active"

        # Now active-release returns 200
        active_resp = client.get("/internal/ml/active-release", headers=auth_header)
        assert active_resp.status_code == 200
        assert active_resp.json()["release_id"] == "rel_test_001"

        # Service status now reflects forecasting=active
        status_resp = client.get("/internal/service/status", headers=auth_header)
        assert status_resp.json()["features"]["forecasting"] == "active"
        assert status_resp.json()["active_release"] == "rel_test_001"
