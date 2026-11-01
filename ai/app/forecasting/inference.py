from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.common.spring_data import SpringDataClient, SpringDataUnavailable
from app.forecasting.features import (
    add_calendar_features,
    compute_flow_and_rainfall_features,
    compute_level_lags_and_rates,
)
from app.forecasting.registry import ModelReleaseRegistry

logger = logging.getLogger(__name__)


@dataclass
class HorizonForecast:
    horizon_hours: int
    target_time: str
    level_p10: float
    level_p50: float
    level_p90: float
    overflow_probability: float | None
    overflow_probability_reason: str | None


@dataclass
class ForecastPredictionResponse:
    dam_id: int
    issued_at: str
    as_of: str
    latest_reading_at: str | None
    freshness: str  # "fresh", "stale", "unavailable"
    demo_mode: bool
    release_id: str
    overflow_threshold_meters: float | None
    overflow_config_version: int | None
    horizons: list[HorizonForecast]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


async def build_inference_features(
    dam_id: int,
    as_of: datetime,
    client: SpringDataClient,
    expected_features: list[str],
) -> tuple[pd.DataFrame, str, datetime | None, float | None, int | None]:
    """Fetches stored readings, status, and weather to build inference feature vector."""
    from_time = as_of - timedelta(days=2)

    # 1. Fetch verified overflow config
    threshold: float | None = None
    config_version: int | None = None
    try:
        ovf_config = await client.get_overflow_config(dam_id)
        if isinstance(ovf_config, dict) and "crestLevelMeters" in ovf_config:
            threshold = float(ovf_config["crestLevelMeters"])
            config_version = ovf_config.get("version")
    except SpringDataUnavailable:
        logger.warning(
            "Could not fetch overflow config for dam %d; proceeding with null threshold", dam_id
        )

    # 2. Fetch sensor readings
    try:
        readings_data = await client.get_readings(dam_id=dam_id, start=from_time, end=as_of)
    except SpringDataUnavailable as exc:
        raise HTTPException(status_code=503, detail="Spring readings data unavailable") from exc

    readings_list = (
        readings_data if isinstance(readings_data, list) else readings_data.get("data", [])
    )

    if not readings_list:
        # No sensor readings available for this dam
        empty_df = pd.DataFrame(columns=expected_features)
        return empty_df, "unavailable", None, threshold, config_version

    # Convert readings to DataFrame
    df_raw = pd.DataFrame(readings_list)
    if "recordedAt" in df_raw.columns:
        df_raw["timestamp"] = pd.to_datetime(df_raw["recordedAt"], utc=True)
    elif "timestamp" in df_raw.columns:
        df_raw["timestamp"] = pd.to_datetime(df_raw["timestamp"], utc=True)
    else:
        df_raw["timestamp"] = pd.to_datetime(as_of, utc=True)

    # Normalize value column (handle both 'value' and Spring's 'readingValue')
    if "value" not in df_raw.columns:
        if "readingValue" in df_raw.columns:
            df_raw["value"] = pd.to_numeric(df_raw["readingValue"], errors="coerce")
        else:
            df_raw["value"] = np.nan
    else:
        df_raw["value"] = pd.to_numeric(df_raw["value"], errors="coerce")

    # Resolve sensorType (from payload or via get_sensors lookup)
    if "sensorType" not in df_raw.columns or df_raw["sensorType"].isna().any():
        try:
            sensors_resp = await client.get_sensors(dam_id)
            sensors_list = (
                sensors_resp if isinstance(sensors_resp, list) else sensors_resp.get("data", [])
            )
            sensor_map = {}
            for s in sensors_list:
                s_id = s.get("id")
                st = s.get("sensorType")
                st_code = st.get("code") if isinstance(st, dict) else st
                if s_id is not None and st_code:
                    sensor_map[s_id] = st_code
            if "sensorId" in df_raw.columns:
                mapped_types = df_raw["sensorId"].map(sensor_map)
                if "sensorType" in df_raw.columns:
                    df_raw["sensorType"] = df_raw["sensorType"].fillna(mapped_types)
                else:
                    df_raw["sensorType"] = mapped_types
        except Exception as e:
            logger.warning("Could not map sensor types for dam %d: %s", dam_id, e)

    # Determine freshness from latest water level reading
    latest_reading_ts = df_raw["timestamp"].max()
    age_seconds = (as_of - latest_reading_ts).total_seconds()
    if age_seconds <= 7200:  # <= 2 hours
        freshness = "fresh"
    else:
        freshness = "stale"

    # Pivot sensor readings: group by timestamp and sensorType
    pivot_df = df_raw.pivot_table(
        index="timestamp",
        columns="sensorType",
        values="value",
        aggfunc="mean",
    ).reset_index()

    # Map standard sensor type names to canonical feature column names
    rename_map = {
        "WATER_LEVEL": "water_level",
        "RAINFALL": "rainfall_rate",
        "RAINFALL_RATE": "rainfall_rate",
        "INFLOW": "inflow",
        "INFLOW_RATE": "inflow",
        "OUTFLOW": "outflow",
        "OUTFLOW_RATE": "outflow",
        "TEMPERATURE": "temperature",
        "SOIL_MOISTURE": "soil_moisture",
    }
    pivot_df = pivot_df.rename(columns=rename_map)

    if "water_level" not in pivot_df.columns:
        # Water level is strictly required for water-level forecasting
        raise HTTPException(
            status_code=422,
            detail=(
                f"Dam {dam_id} has no water_level sensor readings in window "
                f"[{from_time.isoformat()}, {as_of.isoformat()}]."
            ),
        )

    # Sort chronologically
    pivot_df = pivot_df.sort_values(by="timestamp").reset_index(drop=True)

    # Feature engineering: calendar, level lags/rates, net inflow
    feat_df = add_calendar_features(pivot_df, time_col="timestamp")
    feat_df = compute_level_lags_and_rates(feat_df, level_col="water_level")
    feat_df = compute_flow_and_rainfall_features(
        feat_df, inflow_col="inflow", outflow_col="outflow", rainfall_col="rainfall_rate"
    )

    # Fetch weather forecast totals if available
    try:
        weather_resp = await client.get_weather(
            dam_id=dam_id,
            start=from_time,
            end=as_of + timedelta(hours=6),
            as_of=as_of,
        )
        weather_list = (
            weather_resp if isinstance(weather_resp, list) else weather_resp.get("data", [])
        )
        if weather_list:
            w_df = pd.DataFrame(weather_list)
            # Find weather snapshot closest to as_of
            if "forecastRainfall1hMm" in w_df.columns:
                feat_df["weather_forecast_1h"] = float(w_df["forecastRainfall1hMm"].iloc[-1] or 0.0)
            if "forecastRainfall3hMm" in w_df.columns:
                feat_df["weather_forecast_3h"] = float(w_df["forecastRainfall3hMm"].iloc[-1] or 0.0)
            if "forecastRainfall6hMm" in w_df.columns:
                feat_df["weather_forecast_6h"] = float(w_df["forecastRainfall6hMm"].iloc[-1] or 0.0)
    except Exception as e:
        logger.debug("Weather data fetch for inference skipped: %s", e)

    # Take the latest feature row <= as_of
    latest_row = feat_df.iloc[[-1]].copy()

    # Align columns to expected model features (fill absent ones with NaN)
    for col in expected_features:
        if col not in latest_row.columns:
            latest_row[col] = np.nan

    X_infer = latest_row[expected_features]
    return X_infer, freshness, latest_reading_ts.to_pydatetime(), threshold, config_version


async def predict_forecast(
    dam_id: int,
    as_of: datetime,
    demo_mode: bool,
    registry: ModelReleaseRegistry,
    client: SpringDataClient,
) -> ForecastPredictionResponse:
    """Performs multi-horizon inference using the currently active model release."""
    bundle = registry.get_loaded_active_bundle()
    if bundle is None:
        raise HTTPException(
            status_code=409,
            detail="No active model release loaded. Activate a compatible release first.",
        )

    expected_features = bundle.metadata.feature_names
    X_infer, freshness, latest_ts, threshold, config_version = await build_inference_features(
        dam_id=dam_id,
        as_of=as_of,
        client=client,
        expected_features=expected_features,
    )

    if X_infer.empty:
        raise HTTPException(
            status_code=422,
            detail=f"Inference inputs unavailable for dam {dam_id} at {as_of.isoformat()}.",
        )

    horizons_results: list[HorizonForecast] = []
    for h in bundle.metadata.horizons_hours:
        # 1. MultiQuantile level prediction
        lvl_model = bundle.level_models[h]
        lvl_preds = lvl_model.predict(X_infer)

        p10 = float(lvl_preds["p10"].iloc[0])
        p50 = float(lvl_preds["p50"].iloc[0])
        p90 = float(lvl_preds["p90"].iloc[0])

        # 2. Calibrated overflow probability prediction
        ovf_model = bundle.overflow_models[h]
        if ovf_model.is_operational:
            proba_arr = ovf_model.predict_proba(X_infer)
            ovf_prob = float(proba_arr[0]) if proba_arr is not None else None
            reason = None
        else:
            ovf_prob = None
            reason = ovf_model.non_operational_reason

        target_time = (as_of + timedelta(hours=h)).isoformat()
        horizons_results.append(
            HorizonForecast(
                horizon_hours=h,
                target_time=target_time,
                level_p10=round(p10, 3),
                level_p50=round(p50, 3),
                level_p90=round(p90, 3),
                overflow_probability=round(ovf_prob, 4) if ovf_prob is not None else None,
                overflow_probability_reason=reason,
            )
        )

    return ForecastPredictionResponse(
        dam_id=dam_id,
        issued_at=datetime.now(UTC).isoformat(),
        as_of=as_of.isoformat(),
        latest_reading_at=latest_ts.isoformat() if latest_ts is not None else None,
        freshness=freshness,
        demo_mode=demo_mode,
        release_id=bundle.metadata.release_id,
        overflow_threshold_meters=threshold,
        overflow_config_version=config_version,
        horizons=horizons_results,
    )
