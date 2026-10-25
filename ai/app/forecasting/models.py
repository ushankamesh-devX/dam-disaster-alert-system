from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, CatBoostRegressor
from sklearn.calibration import _SigmoidCalibration

logger = logging.getLogger(__name__)

DEFAULT_QUANTILES = [0.1, 0.5, 0.9]
MIN_POSITIVE_EVENTS_FOR_PROMOTION = 5


class WaterLevelMultiQuantileModel:
    """Multi-quantile regression using CatBoost for P10, P50, and P90 water level forecasts."""

    def __init__(
        self,
        horizon_hours: int,
        iterations: int = 250,
        learning_rate: float = 0.05,
        depth: int = 6,
        random_seed: int = 42,
    ) -> None:
        self.horizon_hours = horizon_hours
        self.iterations = iterations
        self.learning_rate = learning_rate
        self.depth = depth
        self.random_seed = random_seed
        self.feature_names: list[str] = []
        self.model: CatBoostRegressor | None = None

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        cat_features: list[str] | None = None,
        eval_set: tuple[pd.DataFrame, pd.Series] | None = None,
    ) -> WaterLevelMultiQuantileModel:
        """Fits CatBoostRegressor with MultiQuantile loss function."""
        valid_mask = y.notna()
        X_clean = X.loc[valid_mask].copy()
        y_clean = y.loc[valid_mask].copy()

        self.feature_names = list(X_clean.columns)
        cat_feats = [c for c in (cat_features or []) if c in self.feature_names]

        alpha_str = ",".join(str(q) for q in DEFAULT_QUANTILES)
        self.model = CatBoostRegressor(
            iterations=self.iterations,
            learning_rate=self.learning_rate,
            depth=self.depth,
            loss_function=f"MultiQuantile:alpha={alpha_str}",
            random_seed=self.random_seed,
            verbose=0,
        )

        eval_data = None
        if eval_set is not None:
            X_eval, y_eval = eval_set
            eval_mask = y_eval.notna()
            eval_data = (X_eval.loc[eval_mask], y_eval.loc[eval_mask])

        self.model.fit(
            X_clean,
            y_clean,
            cat_features=cat_feats if cat_feats else None,
            eval_set=eval_data,
            early_stopping_rounds=30 if eval_data is not None else None,
            verbose=False,
        )
        return self

    def predict(self, X: pd.DataFrame) -> pd.DataFrame:
        """Generates P10, P50, P90 predictions with guaranteed monotonic ordering."""
        if self.model is None:
            raise RuntimeError("Model has not been trained or loaded.")

        X_input = X[self.feature_names]
        raw_preds = self.model.predict(X_input)
        if raw_preds.ndim == 1:
            raw_preds = raw_preds.reshape(-1, 3)

        # Enforce quantile monotonicity: P10 <= P50 <= P90
        sorted_preds = np.sort(raw_preds, axis=1)

        return pd.DataFrame(
            {
                "p10": sorted_preds[:, 0],
                "p50": sorted_preds[:, 1],
                "p90": sorted_preds[:, 2],
            },
            index=X.index,
        )

    def save(self, filepath: Path | str) -> None:
        """Saves CatBoost model to disk."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        meta = {
            "horizon_hours": self.horizon_hours,
            "feature_names": self.feature_names,
            "iterations": self.iterations,
            "learning_rate": self.learning_rate,
            "depth": self.depth,
        }
        joblib.dump({"meta": meta, "model": self.model}, filepath)

    @classmethod
    def load(cls, filepath: Path | str) -> WaterLevelMultiQuantileModel:
        """Loads model from disk."""
        data = joblib.load(filepath)
        meta = data["meta"]
        instance = cls(
            horizon_hours=meta["horizon_hours"],
            iterations=meta["iterations"],
            learning_rate=meta["learning_rate"],
            depth=meta["depth"],
        )
        instance.feature_names = meta["feature_names"]
        instance.model = data["model"]
        return instance


class OverflowProbabilityModel:
    """Binary overflow classification using CatBoost and Sigmoid probability calibration."""

    def __init__(
        self,
        horizon_hours: int,
        iterations: int = 250,
        learning_rate: float = 0.05,
        depth: int = 6,
        random_seed: int = 42,
    ) -> None:
        self.horizon_hours = horizon_hours
        self.iterations = iterations
        self.learning_rate = learning_rate
        self.depth = depth
        self.random_seed = random_seed
        self.feature_names: list[str] = []
        self.base_model: CatBoostClassifier | None = None
        self.calibrator: _SigmoidCalibration | None = None
        self.is_operational: bool = False
        self.non_operational_reason: str | None = None

    def fit(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_calib: pd.DataFrame | None = None,
        y_calib: pd.Series | None = None,
        cat_features: list[str] | None = None,
    ) -> OverflowProbabilityModel:
        """Fits CatBoostClassifier and calibrates probabilities on a separate calibration set."""
        train_mask = y_train.notna()
        X_tr = X_train.loc[train_mask].copy()
        y_tr = y_train.loc[train_mask].astype(int).copy()

        self.feature_names = list(X_tr.columns)
        cat_feats = [c for c in (cat_features or []) if c in self.feature_names]

        pos_train_events = int((y_tr == 1).sum())
        logger.info(
            "Overflow model %dh: %d positive train events out of %d total",
            self.horizon_hours,
            pos_train_events,
            len(y_tr),
        )

        if pos_train_events < MIN_POSITIVE_EVENTS_FOR_PROMOTION:
            self.is_operational = False
            self.non_operational_reason = (
                f"insufficient_historical_events: found {pos_train_events} events, "
                f"minimum required is {MIN_POSITIVE_EVENTS_FOR_PROMOTION}"
            )
            logger.warning(
                "Horizon %dh flagged non-operational: %s",
                self.horizon_hours,
                self.non_operational_reason,
            )
            return self

        # Check negative class exists
        neg_train_events = int((y_tr == 0).sum())
        if neg_train_events == 0:
            self.is_operational = False
            self.non_operational_reason = "single_class_in_train_data"
            return self

        self.base_model = CatBoostClassifier(
            iterations=self.iterations,
            learning_rate=self.learning_rate,
            depth=self.depth,
            loss_function="Logloss",
            random_seed=self.random_seed,
            verbose=0,
        )
        self.base_model.fit(
            X_tr,
            y_tr,
            cat_features=cat_feats if cat_feats else None,
            verbose=False,
        )

        # Calibrate using Sigmoid on calibration set if available and multi-class
        if X_calib is not None and y_calib is not None:
            calib_mask = y_calib.notna()
            X_cal = X_calib.loc[calib_mask][self.feature_names].copy()
            y_cal = y_calib.loc[calib_mask].astype(int).to_numpy()

            pos_calib_events = int((y_cal == 1).sum())
            neg_calib_events = int((y_cal == 0).sum())

            if pos_calib_events >= 2 and neg_calib_events >= 2 and self.base_model is not None:
                probs_raw = self.base_model.predict_proba(X_cal)[:, 1]
                self.calibrator = _SigmoidCalibration().fit(probs_raw, y_cal)
            else:
                logger.info(
                    "Calibration set has insufficient diversity (%d pos, %d neg); "
                    "using uncalibrated base model",
                    pos_calib_events,
                    neg_calib_events,
                )
                self.calibrator = None

        self.is_operational = True
        self.non_operational_reason = None
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray | None:
        """Returns array of probabilities P(overflow=1) in [0, 1], or None if non-operational."""
        if not self.is_operational or self.base_model is None:
            return None

        X_input = X[self.feature_names]
        raw_proba = self.base_model.predict_proba(X_input)[:, 1]
        if self.calibrator is not None:
            proba = self.calibrator.predict(raw_proba)
        else:
            proba = raw_proba

        return np.clip(proba, 0.0, 1.0)

    def save(self, filepath: Path | str) -> None:
        """Saves model state and calibration artifacts."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        payload: dict[str, Any] = {
            "horizon_hours": self.horizon_hours,
            "feature_names": self.feature_names,
            "is_operational": self.is_operational,
            "non_operational_reason": self.non_operational_reason,
            "base_model": self.base_model,
            "calibrator": self.calibrator,
        }
        joblib.dump(payload, filepath)

    @classmethod
    def load(cls, filepath: Path | str) -> OverflowProbabilityModel:
        """Loads model state from disk."""
        data = joblib.load(filepath)
        instance = cls(horizon_hours=data["horizon_hours"])
        instance.feature_names = data["feature_names"]
        instance.is_operational = data["is_operational"]
        instance.non_operational_reason = data.get("non_operational_reason")
        instance.base_model = data.get("base_model")
        instance.calibrator = data.get("calibrator")
        return instance
