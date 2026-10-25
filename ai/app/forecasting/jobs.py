from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class JobRecord:
    job_id: str
    job_type: str
    status: str  # "pending", "running", "completed", "failed"
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    progress_pct: int = 0
    message: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)
    result: dict[str, Any] | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class JobManager:
    """Durable job queue and state tracker with overlap protection."""

    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        self.jobs_dir = self.artifacts_dir / "jobs"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: dict[str, JobRecord] = {}
        self._load_existing_jobs()

    def _load_existing_jobs(self) -> None:
        for f in self.jobs_dir.glob("*.json"):
            try:
                with f.open("r", encoding="utf-8") as fp:
                    data = json.load(fp)
                rec = JobRecord(**data)
                self._jobs[rec.job_id] = rec
            except Exception as e:
                logger.error("Failed to load job file %s: %s", f, e)

    def _save_job(self, record: JobRecord) -> None:
        self._jobs[record.job_id] = record
        job_file = self.jobs_dir / f"{record.job_id}.json"
        temp_file = job_file.with_suffix(".tmp")
        with temp_file.open("w", encoding="utf-8") as fp:
            json.dump(record.to_dict(), fp, indent=2)
        temp_file.replace(job_file)

    def create_job(self, job_type: str, parameters: dict[str, Any] | None = None) -> JobRecord:
        """Creates a new job with overlap protection for running jobs of the same type."""
        # Overlap protection
        for j in self._jobs.values():
            if j.status == JobStatus.RUNNING and j.job_type == job_type:
                raise ValueError(
                    f"A job of type '{job_type}' is already running (job_id={j.job_id})."
                )

        job_id = f"job_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        record = JobRecord(
            job_id=job_id,
            job_type=job_type,
            status=JobStatus.PENDING,
            created_at=datetime.now(UTC).isoformat(),
            parameters=parameters or {},
            progress_pct=0,
            message="Job queued",
        )
        self._save_job(record)
        return record

    def get_job(self, job_id: str) -> JobRecord | None:
        return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 50) -> list[JobRecord]:
        jobs = list(self._jobs.values())
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs[:limit]

    def update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        started: bool = False,
        progress_pct: int | None = None,
        message: str | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> JobRecord:
        record = self._jobs.get(job_id)
        if record is None:
            raise KeyError(f"Job {job_id} not found.")

        if started and record.started_at is None:
            record.started_at = datetime.now(UTC).isoformat()
        if status is not None:
            record.status = status
            if status in (JobStatus.COMPLETED, JobStatus.FAILED):
                record.completed_at = datetime.now(UTC).isoformat()
        if progress_pct is not None:
            record.progress_pct = progress_pct
        if message is not None:
            record.message = message
        if result is not None:
            record.result = result
        if error is not None:
            record.error = error

        self._save_job(record)
        return record


async def execute_retraining_task(
    job_id: str,
    job_manager: JobManager,
    train_func: Any,
    **kwargs: Any,
) -> None:
    """Asynchronous background worker executing candidate retraining."""
    try:
        job_manager.update_job(
            job_id,
            status=JobStatus.RUNNING,
            started=True,
            progress_pct=10,
            message="Initializing training environment and datasets...",
        )

        # Allow event loop yield
        await asyncio.sleep(0.05)

        job_manager.update_job(
            job_id,
            progress_pct=30,
            message="Training baselines and CatBoost candidates...",
        )

        # Run CPU-bound training in executor
        loop = asyncio.get_running_loop()
        metadata = await loop.run_in_executor(None, lambda: train_func(**kwargs))

        job_manager.update_job(
            job_id,
            progress_pct=90,
            message="Evaluating gates and packaging release...",
        )

        job_manager.update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress_pct=100,
            message="Candidate training and evaluation completed successfully.",
            result={
                "release_id": metadata.release_id,
                "passed_gates": metadata.passed_gates,
                "status": metadata.status,
                "dataset_version": metadata.dataset_version,
            },
        )
        logger.info(
            "Training job %s completed successfully: release %s", job_id, metadata.release_id
        )
    except Exception as e:
        logger.error("Training job %s failed: %s", job_id, e, exc_info=True)
        job_manager.update_job(
            job_id,
            status=JobStatus.FAILED,
            progress_pct=100,
            message="Training failed.",
            error=str(e),
        )
