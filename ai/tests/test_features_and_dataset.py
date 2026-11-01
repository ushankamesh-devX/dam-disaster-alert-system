from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.forecasting.dataset import (
    load_dataset_snapshot,
    save_dataset_snapshot,
    train_test_split_chronological,
)
from app.forecasting.features import (
    add_calendar_features,
    build_feature_matrix,
    compute_flow_and_rainfall_features,
    compute_level_lags_and_rates,
    generate_targets,
)


def create_sample_time_series(hours: int = 100) -> pd.DataFrame:
    base_time = datetime(2026, 10, 1, 0, 0, tzinfo=UTC)
    times = [base_time + timedelta(hours=i) for i in range(hours)]
    levels = [430.0 + 0.1 * i + math_sin_wave(i) for i in range(hours)]
    inflows = [50.0 + 2.0 * (i % 10) for i in range(hours)]
    outflows = [45.0 + 1.0 * (i % 5) for i in range(hours)]
    rain = [2.0 if i % 12 == 0 else 0.0 for i in range(hours)]

    return pd.DataFrame(
        {
            "timestamp": times,
            "dam_id": [1] * hours,
            "water_level": levels,
            "inflow": inflows,
            "outflow": outflows,
            "rainfall_rate": rain,
            "overflow_threshold": [445.0] * hours,
        }
    )


def math_sin_wave(idx: int) -> float:
    return float(np.sin(idx / 5.0))


def test_calendar_features_are_bounded_and_colombo_aligned():
    df = create_sample_time_series(24)
    res = add_calendar_features(df)

    for col in (
        "calendar_hour_sin",
        "calendar_hour_cos",
        "calendar_dayofweek_sin",
        "calendar_dayofweek_cos",
        "calendar_month_sin",
        "calendar_month_cos",
    ):
        assert col in res.columns
        assert res[col].between(-1.0001, 1.0001).all()

    # UTC 00:00 is 05:30 in Colombo, hour is 5
    assert res.loc[0, "calendar_hour"] == 5


def test_level_lags_and_rise_rates():
    df = create_sample_time_series(30)
    res = compute_level_lags_and_rates(df)

    assert pd.isna(res.loc[0, "level_lag_1h"])
    assert res.loc[1, "level_lag_1h"] == res.loc[0, "water_level"]
    assert res.loc[3, "level_lag_3h"] == res.loc[0, "water_level"]
    assert res.loc[6, "level_lag_6h"] == res.loc[0, "water_level"]

    # 3-hour rise rate is (level_t - level_t-3) / 3.0
    expected_3h_rate = (res.loc[3, "water_level"] - res.loc[0, "water_level"]) / 3.0
    assert pytest.approx(res.loc[3, "level_rise_rate_3h"]) == expected_3h_rate


def test_net_inflow_and_integrated_rainfall():
    df = create_sample_time_series(20)
    res = compute_flow_and_rainfall_features(df)

    assert "net_inflow" in res.columns
    assert (res["net_inflow"] == res["inflow"] - res["outflow"]).all()

    # 3h integrated rainfall sum
    assert "rainfall_integrated_3h" in res.columns
    expected_sum = df.loc[0:2, "rainfall_rate"].sum()
    assert res.loc[2, "rainfall_integrated_3h"] == expected_sum


def test_target_generation_and_overflow_exceedance():
    # 20 hours, baseline 430.0, spikes to 446.0 at index 10 (exceeds 445 threshold)
    df = create_sample_time_series(20)
    df.loc[10, "water_level"] = 446.0

    res = generate_targets(df)

    # 1h target at index 9: future level at index 10 is 446.0
    assert res.loc[9, "target_level_1h"] == 446.0
    assert res.loc[9, "target_overflow_1h"] == 1.0

    # 3h target at index 8: future window (8, 11] includes 10 (446.0 >= 445.0) -> overflow 1.0
    assert res.loc[8, "target_overflow_3h"] == 1.0

    # 1h target at index 5: future level is well below 445 -> overflow 0.0
    assert res.loc[5, "target_overflow_1h"] == 0.0

    # Missing threshold yields NaN target
    df_missing_thresh = df.copy()
    df_missing_thresh["overflow_threshold"] = np.nan
    res_nan = generate_targets(df_missing_thresh)
    assert res_nan["target_overflow_1h"].isna().all()


def test_chronological_split_with_gap():
    df = create_sample_time_series(100)
    train_df, test_df = train_test_split_chronological(df, test_ratio=0.2, gap_hours=6)

    # Total test rows = 20
    assert len(test_df) == 20
    # Total train rows = 100 - 20 - 6 = 74
    assert len(train_df) == 74

    # Verification: train max time is at least 6 hours before test min time
    train_max = train_df["timestamp"].max()
    test_min = test_df["timestamp"].min()
    assert (test_min - train_max) >= timedelta(hours=6)


def test_dataset_snapshot_and_manifest_checksum(tmp_path: Path):
    df = create_sample_time_series(50)
    feat_df = build_feature_matrix(df)

    manifest = save_dataset_snapshot(feat_df, tmp_path, version="1.0.0")

    assert manifest.version == "1.0.0"
    assert manifest.record_count == 50
    assert len(manifest.sha256) == 64
    assert "target_level_1h" in manifest.target_columns
    assert "level_lag_1h" in manifest.feature_columns

    loaded_df, loaded_manifest = load_dataset_snapshot(tmp_path, version="1.0.0")
    assert len(loaded_df) == 50
    assert loaded_manifest.sha256 == manifest.sha256

    # Tampering test: corrupt file and verify error
    data_file = tmp_path / "dataset_v1.0.0.csv"
    data_file.write_text("corrupted content", encoding="utf-8")
    with pytest.raises(ValueError, match="checksum mismatch"):
        load_dataset_snapshot(tmp_path, version="1.0.0")
