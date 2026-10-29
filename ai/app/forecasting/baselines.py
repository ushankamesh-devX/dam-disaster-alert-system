from __future__ import annotations

import numpy as np
import pandas as pd


class WaterLevelPersistenceBaseline:
    """Baseline predicting the last observed water level for any forecast horizon.

    When fitted on training residuals, estimates empirical uncertainty intervals:
    P10 = level - 1.282 * sigma
    P50 = level
    P90 = level + 1.282 * sigma
    representing a nominal 80% prediction interval.
    """

    def __init__(self, level_col: str = "water_level") -> None:
        self.level_col = level_col
        self.residual_sigma: float = 0.0
        self.is_fitted: bool = False

    def fit(self, df: pd.DataFrame, target_series: pd.Series) -> WaterLevelPersistenceBaseline:
        """Computes residual standard deviation between target and current level."""
        current_level = df[self.level_col]
        valid_mask = current_level.notna() & target_series.notna()
        if valid_mask.sum() > 1:
            diffs = target_series[valid_mask] - current_level[valid_mask]
            self.residual_sigma = float(np.std(diffs, ddof=1))
        else:
            self.residual_sigma = 0.0
        self.is_fitted = True
        return self

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """Returns DataFrame with columns ['p10', 'p50', 'p90']."""
        p50 = df[self.level_col].copy()
        if self.is_fitted and self.residual_sigma > 0.0:
            delta = 1.28155 * self.residual_sigma
            p10 = p50 - delta
            p90 = p50 + delta
        else:
            p10 = p50.copy()
            p90 = p50.copy()

        return pd.DataFrame({"p10": p10, "p50": p50, "p90": p90}, index=df.index)


class OverflowFrequencyBaseline:
    """Baseline predicting historical overflow event frequency (base rate)."""

    def __init__(self) -> None:
        self.base_rate: float = 0.0
        self.total_samples: int = 0
        self.positive_samples: int = 0
        self.is_fitted: bool = False

    def fit(self, target_series: pd.Series) -> OverflowFrequencyBaseline:
        """Computes the empirical positive frequency from the training series."""
        valid = target_series.dropna()
        self.total_samples = len(valid)
        self.positive_samples = int((valid > 0.5).sum())
        if self.total_samples > 0:
            self.base_rate = float(self.positive_samples / self.total_samples)
        else:
            self.base_rate = 0.0
        self.is_fitted = True
        return self

    def predict_proba(self, n_samples: int) -> np.ndarray:
        """Returns array of shape (n_samples,) with constant base rate probability."""
        return np.full(shape=(n_samples,), fill_value=self.base_rate, dtype=np.float64)
