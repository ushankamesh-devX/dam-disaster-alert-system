"""Feature engineering and target definition for dam water-level and overflow forecasting.

Complies strictly with ai/docs/DATA.md and ai/docs/PLAN.md:
- Target horizons: 1, 3, and 6 hours.
- Central water level target at t+H.
- Overflow target: verified threshold exceedance anywhere within the horizon window.
- Lags, rise rates, rolling averages, net inflow, integrated rainfall, and calendar features.
- Strict temporal causality: no future observations leak into features at cutoff t.
"""

from __future__ import annotations

import math
from typing import Final
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

COLOMBO_TZ: Final = ZoneInfo("Asia/Colombo")
HORIZONS_HOURS: Final = (1, 3, 6)


def add_calendar_features(df: pd.DataFrame, time_col: str = "timestamp") -> pd.DataFrame:
    """Derives calendar features in Asia/Colombo timezone with cyclical encoding."""
    res = df.copy()
    if not isinstance(res[time_col].dtype, pd.DatetimeTZDtype):
        ts = pd.to_datetime(res[time_col], utc=True).dt.tz_convert(COLOMBO_TZ)
    else:
        ts = res[time_col].dt.tz_convert(COLOMBO_TZ)

    hour = ts.dt.hour
    dayofweek = ts.dt.day_of_week
    month = ts.dt.month

    res["calendar_hour"] = hour
    res["calendar_hour_sin"] = np.sin(2 * math.pi * hour / 24.0)
    res["calendar_hour_cos"] = np.cos(2 * math.pi * hour / 24.0)

    res["calendar_dayofweek"] = dayofweek
    res["calendar_dayofweek_sin"] = np.sin(2 * math.pi * dayofweek / 7.0)
    res["calendar_dayofweek_cos"] = np.cos(2 * math.pi * dayofweek / 7.0)

    res["calendar_month"] = month
    res["calendar_month_sin"] = np.sin(2 * math.pi * (month - 1) / 12.0)
    res["calendar_month_cos"] = np.cos(2 * math.pi * (month - 1) / 12.0)
    return res


def compute_level_lags_and_rates(df: pd.DataFrame, level_col: str = "water_level") -> pd.DataFrame:
    """Computes water level lags (1, 2, 3, 6h), rise rates, and rolling statistics."""
    res = df.copy()
    # Lags
    for lag in (1, 2, 3, 6):
        res[f"level_lag_{lag}h"] = res[level_col].shift(lag)

    # Rise rates (delta per hour)
    res["level_rise_rate_1h"] = res[level_col] - res["level_lag_1h"]
    res["level_rise_rate_3h"] = (res[level_col] - res["level_lag_3h"]) / 3.0
    res["level_rise_rate_6h"] = (res[level_col] - res["level_lag_6h"]) / 6.0

    # Rolling statistics over past observations (closed='left' or shift(1) to avoid leaking t)
    # Using shift(0) here because rolling features at time t can include observation at time t
    res["level_roll_mean_3h"] = res[level_col].rolling(window=3, min_periods=1).mean()
    res["level_roll_mean_6h"] = res[level_col].rolling(window=6, min_periods=2).mean()
    res["level_roll_mean_24h"] = res[level_col].rolling(window=24, min_periods=6).mean()

    res["level_roll_std_6h"] = res[level_col].rolling(window=6, min_periods=3).std().fillna(0.0)
    res["level_roll_max_24h"] = res[level_col].rolling(window=24, min_periods=1).max()
    res["level_roll_min_24h"] = res[level_col].rolling(window=24, min_periods=1).min()
    return res


def compute_flow_and_rainfall_features(
    df: pd.DataFrame,
    inflow_col: str = "inflow",
    outflow_col: str = "outflow",
    rainfall_col: str = "rainfall_rate",
) -> pd.DataFrame:
    """Computes net inflow, integrated rainfall totals, and rolling flow averages."""
    res = df.copy()

    if inflow_col in res.columns and outflow_col in res.columns:
        res["net_inflow"] = res[inflow_col] - res[outflow_col]
        res["net_inflow_lag_1h"] = res["net_inflow"].shift(1)
        res["inflow_roll_mean_6h"] = res[inflow_col].rolling(window=6, min_periods=1).mean()
        res["outflow_roll_mean_6h"] = res[outflow_col].rolling(window=6, min_periods=1).mean()

    if rainfall_col in res.columns:
        res["rainfall_integrated_1h"] = res[rainfall_col]
        res["rainfall_integrated_3h"] = res[rainfall_col].rolling(window=3, min_periods=1).sum()
        res["rainfall_integrated_6h"] = res[rainfall_col].rolling(window=6, min_periods=1).sum()
        res["rainfall_integrated_24h"] = res[rainfall_col].rolling(window=24, min_periods=1).sum()

    return res


def generate_targets(
    df: pd.DataFrame,
    level_col: str = "water_level",
    overflow_threshold_col: str = "overflow_threshold",
    horizons: tuple[int, ...] = HORIZONS_HOURS,
) -> pd.DataFrame:
    """Generates continuous water-level and binary overflow exceedance targets for each horizon.

    - Level target at horizon H: observed level at t+H.
    - Overflow target at horizon H: 1 if any observed level in (t, t+H] >= threshold, else 0.
      Missing/null threshold yields null overflow target.
    """
    res = df.copy()

    for h in horizons:
        # Future level at exact horizon
        res[f"target_level_{h}h"] = res[level_col].shift(-h)

        # Future window for overflow check: (t, t+h]
        # Rolling on reversed series or shifting forward windows
        # Window of future values from shift(-1) to shift(-h)
        future_window = pd.concat([res[level_col].shift(-k) for k in range(1, h + 1)], axis=1)
        future_max = future_window.max(axis=1)

        if overflow_threshold_col in res.columns:
            threshold = res[overflow_threshold_col]
            valid_mask = future_max.notna() & threshold.notna()
            target_series = pd.Series(index=res.index, dtype="float64")
            exceeds = future_max[valid_mask] >= threshold[valid_mask]
            target_series[valid_mask] = exceeds.astype(float)
            res[f"target_overflow_{h}h"] = target_series
        else:
            res[f"target_overflow_{h}h"] = np.nan

    return res


def build_feature_matrix(
    df: pd.DataFrame,
    level_col: str = "water_level",
    overflow_threshold_col: str = "overflow_threshold",
    time_col: str = "timestamp",
    generate_target_cols: bool = True,
) -> pd.DataFrame:
    """Full pipeline building calendar, level, flow, and target columns."""
    df_sorted = df.sort_values(by=time_col).reset_index(drop=True)
    df_cal = add_calendar_features(df_sorted, time_col=time_col)
    df_levels = compute_level_lags_and_rates(df_cal, level_col=level_col)
    df_flows = compute_flow_and_rainfall_features(df_levels)

    if generate_target_cols:
        return generate_targets(
            df_flows, level_col=level_col, overflow_threshold_col=overflow_threshold_col
        )
    return df_flows
