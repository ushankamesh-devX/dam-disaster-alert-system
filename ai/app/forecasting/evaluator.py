from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, roc_auc_score


@dataclass
class LevelEvaluation:
    horizon_hours: int
    sample_count: int
    mae: float
    rmse: float
    baseline_mae: float
    mae_improvement_pct: float
    coverage_80: float
    mean_interval_width: float
    quantile_inversions: int
    passed_gate: bool
    reasons: list[str]


@dataclass
class OverflowEvaluation:
    horizon_hours: int
    sample_count: int
    positive_count: int
    negative_count: int
    is_operational: bool
    non_operational_reason: str | None
    brier_score: float | None
    baseline_brier_score: float | None
    roc_auc: float | None
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    passed_gate: bool
    reasons: list[str]


@dataclass
class ReleaseEvaluationReport:
    evaluated_at: str
    overall_passed: bool
    level_evaluations: dict[int, LevelEvaluation]
    overflow_evaluations: dict[int, OverflowEvaluation]
    summary_reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def evaluate_level_forecasts(
    horizon_hours: int,
    actual_series: pd.Series,
    candidate_preds: pd.DataFrame,
    baseline_preds: pd.DataFrame,
) -> LevelEvaluation:
    """Evaluates multi-quantile water level predictions against actuals and baseline."""
    valid_mask = (
        actual_series.notna()
        & candidate_preds["p50"].notna()
        & candidate_preds["p10"].notna()
        & candidate_preds["p90"].notna()
        & baseline_preds["p50"].notna()
    )

    y_true = actual_series[valid_mask].to_numpy()
    p10 = candidate_preds.loc[valid_mask, "p10"].to_numpy()
    p50 = candidate_preds.loc[valid_mask, "p50"].to_numpy()
    p90 = candidate_preds.loc[valid_mask, "p90"].to_numpy()
    base_p50 = baseline_preds.loc[valid_mask, "p50"].to_numpy()

    sample_count = len(y_true)
    if sample_count == 0:
        return LevelEvaluation(
            horizon_hours=horizon_hours,
            sample_count=0,
            mae=float("nan"),
            rmse=float("nan"),
            baseline_mae=float("nan"),
            mae_improvement_pct=0.0,
            coverage_80=0.0,
            mean_interval_width=0.0,
            quantile_inversions=0,
            passed_gate=False,
            reasons=["no_valid_samples"],
        )

    mae = float(np.mean(np.abs(p50 - y_true)))
    rmse = float(math.sqrt(np.mean((p50 - y_true) ** 2)))
    baseline_mae = float(np.mean(np.abs(base_p50 - y_true)))

    improvement_pct = 0.0
    if baseline_mae > 1e-6:
        improvement_pct = float(((baseline_mae - mae) / baseline_mae) * 100.0)

    covered = (y_true >= p10) & (y_true <= p90)
    coverage_80 = float(np.mean(covered))
    mean_width = float(np.mean(p90 - p10))

    inversions = int(np.sum((p10 > p50) | (p50 > p90)))

    reasons: list[str] = []
    passed = True

    # Gate: candidate MAE must not exceed persistence baseline + 5% tolerance
    if baseline_mae > 0 and mae > baseline_mae * 1.05:
        passed = False
        reasons.append(
            f"mae_worse_than_baseline: candidate={mae:.4f} vs baseline={baseline_mae:.4f}"
        )

    # Gate: nominal 80% coverage should avoid severe undercoverage (< 50%)
    if coverage_80 < 0.50:
        passed = False
        reasons.append(f"interval_coverage_too_low: {coverage_80 * 100:.1f}%")

    # Gate: zero quantile inversions
    if inversions > 0:
        passed = False
        reasons.append(f"quantile_inversions_detected: {inversions}")

    return LevelEvaluation(
        horizon_hours=horizon_hours,
        sample_count=sample_count,
        mae=mae,
        rmse=rmse,
        baseline_mae=baseline_mae,
        mae_improvement_pct=improvement_pct,
        coverage_80=coverage_80,
        mean_interval_width=mean_width,
        quantile_inversions=inversions,
        passed_gate=passed,
        reasons=reasons,
    )


def evaluate_overflow_forecasts(
    horizon_hours: int,
    actual_series: pd.Series,
    candidate_proba: np.ndarray | None,
    baseline_proba: np.ndarray | None,
    is_operational: bool,
    non_operational_reason: str | None,
) -> OverflowEvaluation:
    """Evaluates overflow exceedance probabilities against actual outcomes."""
    valid_mask = actual_series.notna()
    y_true = actual_series[valid_mask].astype(int).to_numpy()
    sample_count = len(y_true)
    pos_count = int(np.sum(y_true == 1))
    neg_count = int(np.sum(y_true == 0))

    if not is_operational or candidate_proba is None:
        return OverflowEvaluation(
            horizon_hours=horizon_hours,
            sample_count=sample_count,
            positive_count=pos_count,
            negative_count=neg_count,
            is_operational=False,
            non_operational_reason=non_operational_reason or "insufficient_historical_events",
            brier_score=None,
            baseline_brier_score=None,
            roc_auc=None,
            true_positives=0,
            false_positives=0,
            true_negatives=0,
            false_negatives=0,
            passed_gate=True,  # Operational status does not block candidate level release
            reasons=[non_operational_reason or "insufficient_historical_events"],
        )

    y_prob = candidate_proba[valid_mask]
    brier = float(brier_score_loss(y_true, y_prob))

    base_brier = None
    if baseline_proba is not None:
        base_brier = float(brier_score_loss(y_true, baseline_proba[valid_mask]))

    auc = None
    if pos_count > 0 and neg_count > 0:
        try:
            auc = float(roc_auc_score(y_true, y_prob))
        except ValueError:
            auc = None

    # Decision threshold at 0.5
    y_pred_bin = (y_prob >= 0.5).astype(int)
    tp = int(np.sum((y_pred_bin == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred_bin == 1) & (y_true == 0)))
    tn = int(np.sum((y_pred_bin == 0) & (y_true == 0)))
    fn = int(np.sum((y_pred_bin == 0) & (y_true == 1)))

    reasons: list[str] = []
    passed = True

    # Gate: candidate Brier score should not be significantly worse than base rate
    if base_brier is not None and brier > (base_brier + 0.05):
        passed = False
        reasons.append(f"brier_worse_than_baseline: {brier:.4f} vs {base_brier:.4f}")

    return OverflowEvaluation(
        horizon_hours=horizon_hours,
        sample_count=sample_count,
        positive_count=pos_count,
        negative_count=neg_count,
        is_operational=True,
        non_operational_reason=None,
        brier_score=brier,
        baseline_brier_score=base_brier,
        roc_auc=auc,
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        passed_gate=passed,
        reasons=reasons,
    )
