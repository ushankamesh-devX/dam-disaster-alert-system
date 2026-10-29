from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any

from app.common.spring_data import SpringDataClient
from app.forecasting.jobs import JobManager, JobStatus
from app.forecasting.registry import ModelReleaseRegistry

logger = logging.getLogger(__name__)


@dataclass
class ReleaseHealthSummary:
    active_release_id: str | None
    created_at: str | None
    passed_gates: bool | None
    has_rollback_target: bool
    status: str  # "healthy", "degraded", "unloaded"


@dataclass
class JobHealthSummary:
    total_jobs: int
    running_jobs: int
    failed_jobs_24h: int
    latest_job_status: str | None


@dataclass
class ForecastPerformanceSummary:
    dams_monitored: int
    latest_forecast_time: str | None
    overall_freshness: str  # "fresh", "stale", "unavailable"
    elapsed_forecasts_evaluated: int
    level_mae: float | None
    interval_coverage_80: float | None


@dataclass
class MonitoringReport:
    generated_at: str
    overall_status: str  # "ok", "warning", "critical"
    release_health: ReleaseHealthSummary
    job_health: JobHealthSummary
    performance: ForecastPerformanceSummary

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


async def generate_monitoring_report(
    registry: ModelReleaseRegistry,
    client: SpringDataClient,
    job_manager: JobManager,
) -> MonitoringReport:
    """Aggregates release status, background job health, and forecast accuracy metrics."""
    now_str = datetime.now(UTC).isoformat()

    # 1. Active Release Health
    active_rel = registry.get_active_release()
    rollback_id = None
    if registry.active_pointer_file.exists():
        try:
            import json

            with registry.active_pointer_file.open("r", encoding="utf-8") as f:
                data = json.load(f)
            rollback_id = data.get("previous_release_id")
        except Exception:
            pass

    has_rollback = bool(rollback_id and registry.get_release(rollback_id) is not None)

    if active_rel is None:
        rel_health = ReleaseHealthSummary(
            active_release_id=None,
            created_at=None,
            passed_gates=None,
            has_rollback_target=False,
            status="unloaded",
        )
    else:
        rel_health = ReleaseHealthSummary(
            active_release_id=active_rel.release_id,
            created_at=active_rel.created_at,
            passed_gates=active_rel.passed_gates,
            has_rollback_target=has_rollback,
            status="healthy" if active_rel.passed_gates else "degraded",
        )

    # 2. Job Queue Health
    jobs = job_manager.list_jobs(limit=100)
    running_count = sum(1 for j in jobs if j.status == JobStatus.RUNNING)
    failed_24h = sum(1 for j in jobs if j.status == JobStatus.FAILED)
    latest_status = jobs[0].status if jobs else None

    job_health = JobHealthSummary(
        total_jobs=len(jobs),
        running_jobs=running_count,
        failed_jobs_24h=failed_24h,
        latest_job_status=latest_status,
    )

    # 3. Forecast Freshness & Monitored Dams
    dams_count = 0
    overall_freshness = "unavailable"
    latest_forecast_time = None
    try:
        dams_resp = await client.get_dams()
        dams_list = dams_resp if isinstance(dams_resp, list) else dams_resp.get("data", [])
        dams_count = len(dams_list)

        if dams_list:
            # Check latest forecast for the first dam to probe persistence
            first_dam_id = dams_list[0].get("id") if isinstance(dams_list[0], dict) else 1
            forecasts = await client.get_forecasts(first_dam_id, limit=3)
            f_list = forecasts if isinstance(forecasts, list) else forecasts.get("data", [])
            if f_list:
                latest_forecast_time = f_list[0].get("asOf") or f_list[0].get("issuedAt")
                freshness_val = f_list[0].get("freshness", "fresh")
                overall_freshness = freshness_val
    except Exception as e:
        logger.debug("Failed querying Spring stored data for monitoring: %s", e)

    # Mock performance summary on real-time elapsed forecasts (can expand with DB queries)
    perf = ForecastPerformanceSummary(
        dams_monitored=dams_count,
        latest_forecast_time=latest_forecast_time,
        overall_freshness=overall_freshness,
        elapsed_forecasts_evaluated=0,
        level_mae=None,
        interval_coverage_80=None,
    )

    # Overall system health evaluation
    overall_status = "ok"
    if active_rel is None:
        overall_status = "warning"
    elif not active_rel.passed_gates or failed_24h > 3:
        overall_status = "critical"
    elif overall_freshness == "stale":
        overall_status = "warning"

    return MonitoringReport(
        generated_at=now_str,
        overall_status=overall_status,
        release_health=rel_health,
        job_health=job_health,
        performance=perf,
    )
