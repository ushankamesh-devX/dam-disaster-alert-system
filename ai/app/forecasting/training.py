from __future__ import annotations

import json
import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.forecasting.baselines import (
    OverflowFrequencyBaseline,
    WaterLevelPersistenceBaseline,
)
from app.forecasting.dataset import train_test_split_chronological
from app.forecasting.evaluator import (
    evaluate_level_forecasts,
    evaluate_overflow_forecasts,
)
from app.forecasting.models import (
    OverflowProbabilityModel,
    WaterLevelMultiQuantileModel,
)
from app.forecasting.registry import ReleaseMetadata

logger = logging.getLogger(__name__)


def get_git_commit_hash() -> str | None:
    """Attempts to get current git commit hash, returning None if unavailable."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return None


def train_and_evaluate_release(
    df: pd.DataFrame,
    feature_cols: list[str],
    artifacts_dir: Path,
    dataset_version: str | None = None,
    dataset_sha256: str | None = None,
    time_col: str = "timestamp",
    horizons_hours: tuple[int, ...] = (1, 3, 6),
    iterations: int = 150,
    use_mlflow: bool = False,
    mlflow_tracking_uri: str | None = None,
) -> ReleaseMetadata:
    """Trains baselines and CatBoost candidates, evaluates against release gates, and packages."""
    max_h = max(horizons_hours)
    # Split: 70% train, 15% calibration, 15% validation with horizon gaps
    train_df, holdout_df = train_test_split_chronological(
        df,
        test_ratio=0.30,
        gap_hours=max_h,
        time_col=time_col,
    )
    calib_df, val_df = train_test_split_chronological(
        holdout_df,
        test_ratio=0.50,
        gap_hours=max_h,
        time_col=time_col,
    )

    release_id = f"rel_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"
    release_dir = Path(artifacts_dir) / "releases" / release_id
    models_dir = release_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    level_evaluations: dict[int, Any] = {}
    overflow_evaluations: dict[int, Any] = {}
    level_models: dict[int, WaterLevelMultiQuantileModel] = {}
    overflow_models: dict[int, OverflowProbabilityModel] = {}

    all_level_gates_passed = True
    gate_reasons: list[str] = []

    X_train = train_df[feature_cols]
    X_calib = calib_df[feature_cols]
    X_val = val_df[feature_cols]

    for h in horizons_hours:
        lvl_target = f"target_level_{h}h"
        ovf_target = f"target_overflow_{h}h"

        # 1. Baseline - Water Level Persistence
        base_lvl = WaterLevelPersistenceBaseline(level_col="water_level")
        base_lvl.fit(train_df, train_df[lvl_target])
        base_lvl_preds = base_lvl.predict(val_df)

        # 2. Candidate - Water Level MultiQuantile CatBoost
        lvl_model = WaterLevelMultiQuantileModel(horizon_hours=h, iterations=iterations)
        lvl_model.fit(
            X_train,
            train_df[lvl_target],
            eval_set=(X_val, val_df[lvl_target]),
        )
        cand_lvl_preds = lvl_model.predict(X_val)

        lvl_eval = evaluate_level_forecasts(
            horizon_hours=h,
            actual_series=val_df[lvl_target],
            candidate_preds=cand_lvl_preds,
            baseline_preds=base_lvl_preds,
        )
        level_evaluations[h] = lvl_eval
        if not lvl_eval.passed_gate:
            all_level_gates_passed = False
            gate_reasons.extend([f"Level {h}h: {r}" for r in lvl_eval.reasons])

        # 3. Baseline - Overflow Event Frequency
        base_ovf = OverflowFrequencyBaseline()
        if ovf_target in train_df.columns:
            base_ovf.fit(train_df[ovf_target])
        base_ovf_proba = base_ovf.predict_proba(len(val_df))

        # 4. Candidate - Overflow CatBoost + Sigmoid Calibration
        ovf_model = OverflowProbabilityModel(horizon_hours=h, iterations=iterations)
        if ovf_target in train_df.columns:
            ovf_model.fit(
                X_train=X_train,
                y_train=train_df[ovf_target],
                X_calib=X_calib,
                y_calib=calib_df[ovf_target] if ovf_target in calib_df.columns else None,
            )

        cand_ovf_proba = ovf_model.predict_proba(X_val) if ovf_model.is_operational else None

        ovf_eval = evaluate_overflow_forecasts(
            horizon_hours=h,
            actual_series=val_df[ovf_target]
            if ovf_target in val_df.columns
            else pd.Series(dtype=float),
            candidate_proba=cand_ovf_proba,
            baseline_proba=base_ovf_proba,
            is_operational=ovf_model.is_operational,
            non_operational_reason=ovf_model.non_operational_reason,
        )
        overflow_evaluations[h] = ovf_eval
        if not ovf_eval.passed_gate:
            gate_reasons.extend([f"Overflow {h}h: {r}" for r in ovf_eval.reasons])

        # Save model artifacts
        lvl_model.save(models_dir / f"level_{h}h.joblib")
        ovf_model.save(models_dir / f"overflow_{h}h.joblib")
        level_models[h] = lvl_model
        overflow_models[h] = ovf_model

    overall_passed = all_level_gates_passed and all(
        ev.passed_gate for ev in overflow_evaluations.values()
    )

    # Build metadata
    evaluation_summary = {
        "level_metrics": {h: ev.__dict__ for h, ev in level_evaluations.items()},
        "overflow_metrics": {h: ev.__dict__ for h, ev in overflow_evaluations.items()},
        "gate_reasons": gate_reasons,
    }

    metadata = ReleaseMetadata(
        release_id=release_id,
        created_at=datetime.now(UTC).isoformat(),
        status="candidate" if overall_passed else "rejected",
        dataset_version=dataset_version,
        dataset_sha256=dataset_sha256,
        git_commit=get_git_commit_hash(),
        feature_names=feature_cols,
        horizons_hours=list(horizons_hours),
        passed_gates=overall_passed,
        evaluation_summary=evaluation_summary,
    )

    # Save metadata.json
    with (release_dir / "metadata.json").open("w", encoding="utf-8") as f:
        json.dump(metadata.to_dict(), f, indent=2)

    # Optional MLflow tracking integration
    if use_mlflow:
        _log_to_mlflow(
            metadata=metadata,
            tracking_uri=mlflow_tracking_uri,
            release_dir=release_dir,
            level_evaluations=level_evaluations,
            overflow_evaluations=overflow_evaluations,
        )

    return metadata


def _log_to_mlflow(
    metadata: ReleaseMetadata,
    tracking_uri: str | None,
    release_dir: Path,
    level_evaluations: dict[int, Any],
    overflow_evaluations: dict[int, Any],
) -> None:
    """Logs run parameters, evaluation metrics, and model release artifacts to MLflow."""
    try:
        import urllib.request
        import mlflow

        if tracking_uri:
            if tracking_uri.startswith(("http://", "https://")):
                try:
                    # Quick check to ensure MLflow server is actively listening
                    urllib.request.urlopen(f"{tracking_uri.rstrip('/')}/health", timeout=1.5)
                except Exception as check_exc:
                    logger.warning(
                        "MLflow tracking server at %s is unreachable (%s). Skipping remote logging.",
                        tracking_uri,
                        check_exc,
                    )
                    return
            mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment("ddas-water-level-forecasting")

        with mlflow.start_run(run_name=metadata.release_id):
            mlflow.log_params(
                {
                    "release_id": metadata.release_id,
                    "dataset_version": metadata.dataset_version or "unknown",
                    "dataset_sha256": metadata.dataset_sha256 or "unknown",
                    "git_commit": metadata.git_commit or "unknown",
                    "passed_gates": metadata.passed_gates,
                    "num_features": len(metadata.feature_names),
                }
            )

            for h, ev in level_evaluations.items():
                if not np.isnan(ev.mae):
                    mlflow.log_metric(f"level_{h}h_mae", ev.mae)
                    mlflow.log_metric(f"level_{h}h_rmse", ev.rmse)
                    mlflow.log_metric(f"level_{h}h_baseline_mae", ev.baseline_mae)
                    mlflow.log_metric(f"level_{h}h_coverage_80", ev.coverage_80)
                    mlflow.log_metric(f"level_{h}h_interval_width", ev.mean_interval_width)

            for h, ovf in overflow_evaluations.items():
                if ovf.brier_score is not None:
                    mlflow.log_metric(f"overflow_{h}h_brier_score", ovf.brier_score)
                if ovf.roc_auc is not None:
                    mlflow.log_metric(f"overflow_{h}h_roc_auc", ovf.roc_auc)

            mlflow.log_artifact(str(release_dir / "metadata.json"))
            mlflow.log_artifacts(str(release_dir / "models"), artifact_path="models")
            logger.info("Successfully logged release %s to MLflow", metadata.release_id)
    except Exception as exc:
        logger.warning("MLflow logging failed: %s", exc)
