import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.common.config import Settings
from app.forecasting.jobs import JobManager, JobStatus, execute_retraining_task
from app.forecasting.monitoring import generate_monitoring_report
from app.forecasting.registry import ModelReleaseRegistry, ReleaseMetadata
from app.main import create_app

INCOMING_TOKEN = "test-only-incoming-service-token-00000001"
OUTGOING_TOKEN = "test-only-spring-service-token-000000002"


def test_job_manager_lifecycle_and_overlap_protection(tmp_path: Path):
    manager = JobManager(tmp_path)
    assert manager.list_jobs() == []

    # 1. Create job
    job = manager.create_job(job_type="train", parameters={"iterations": 10})
    assert job.status == JobStatus.PENDING
    assert job.job_type == "train"
    assert job.parameters["iterations"] == 10

    # 2. Update job to running
    manager.update_job(job.job_id, status=JobStatus.RUNNING, started=True, progress_pct=25)
    running_job = manager.get_job(job.job_id)
    assert running_job is not None
    assert running_job.status == JobStatus.RUNNING
    assert running_job.started_at is not None

    # 3. Overlap protection: cannot start another 'train' job while one is running
    with pytest.raises(ValueError, match="already running"):
        manager.create_job(job_type="train")

    # 4. Can create job of different type (e.g. evaluate)
    eval_job = manager.create_job(job_type="evaluate")
    assert eval_job.job_type == "evaluate"

    # 5. Complete first job
    manager.update_job(
        job.job_id,
        status=JobStatus.COMPLETED,
        progress_pct=100,
        result={"release_id": "rel_test_123"},
    )
    completed_job = manager.get_job(job.job_id)
    assert completed_job.status == JobStatus.COMPLETED
    assert completed_job.completed_at is not None
    assert completed_job.result == {"release_id": "rel_test_123"}

    # 6. Now another 'train' job can be created
    new_train = manager.create_job(job_type="train")
    assert new_train.status == JobStatus.PENDING


@pytest.mark.anyio
async def test_execute_retraining_task_success(tmp_path: Path):
    manager = JobManager(tmp_path)
    job = manager.create_job("train")

    class MockMetadata:
        release_id = "rel_mock_001"
        passed_gates = True
        status = "candidate"
        dataset_version = "1.0.0"

    def mock_train_func(**kwargs):
        return MockMetadata()

    await execute_retraining_task(
        job_id=job.job_id,
        job_manager=manager,
        train_func=mock_train_func,
    )

    updated = manager.get_job(job.job_id)
    assert updated.status == JobStatus.COMPLETED
    assert updated.progress_pct == 100
    assert updated.result["release_id"] == "rel_mock_001"


@pytest.mark.anyio
async def test_execute_retraining_task_failure(tmp_path: Path):
    manager = JobManager(tmp_path)
    job = manager.create_job("train")

    def failing_train(**kwargs):
        raise RuntimeError("Simulated GPU/OOM training crash")

    await execute_retraining_task(
        job_id=job.job_id,
        job_manager=manager,
        train_func=failing_train,
    )

    updated = manager.get_job(job.job_id)
    assert updated.status == JobStatus.FAILED
    assert "Simulated GPU/OOM" in (updated.error or "")


@pytest.mark.anyio
async def test_generate_monitoring_report(tmp_path: Path):
    registry = ModelReleaseRegistry(tmp_path)
    manager = JobManager(tmp_path)

    def mock_handler(req: httpx.Request):
        return httpx.Response(200, json={"data": [{"id": 1, "name": "Victoria Dam"}]})

    transport = httpx.MockTransport(mock_handler)
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    async with httpx.AsyncClient(
        base_url="http://127.0.0.1:8080/api/v1/internal/ml/",
        transport=transport,
    ) as http_client:
        from app.common.spring_data import SpringDataClient

        spring_client = SpringDataClient(http_client, config)

        # 1. Unloaded release report
        report_unloaded = await generate_monitoring_report(registry, spring_client, manager)
        assert report_unloaded.release_health.status == "unloaded"
        assert report_unloaded.overall_status == "warning"

        # 2. Add active release
        rel_dir = tmp_path / "releases" / "rel_active_001"
        rel_dir.mkdir(parents=True, exist_ok=True)
        meta = ReleaseMetadata(
            release_id="rel_active_001",
            created_at="2026-10-24T12:00:00Z",
            status="active",
            dataset_version="v1.0",
            dataset_sha256="abc",
            git_commit="test-commit",
            feature_names=["f1"],
            horizons_hours=[1, 3, 6],
            passed_gates=True,
            evaluation_summary={},
        )
        with (rel_dir / "metadata.json").open("w", encoding="utf-8") as f:
            json.dump(meta.to_dict(), f)
        with (tmp_path / "active_release.json").open("w", encoding="utf-8") as f:
            json.dump({"active_release_id": "rel_active_001", "previous_release_id": None}, f)

        report_active = await generate_monitoring_report(registry, spring_client, manager)
        assert report_active.release_health.status == "healthy"
        assert report_active.overall_status == "ok"
        assert report_active.performance.dams_monitored == 1


def test_job_and_monitoring_api_endpoints(tmp_path: Path):
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    def mock_handler(req: httpx.Request):
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(mock_handler)
    app = create_app(config, spring_transport=transport)

    with TestClient(app) as client:
        auth_header = {"Authorization": f"Bearer {INCOMING_TOKEN}"}

        # 1. Post job unauthenticated -> 401
        unauth = client.post("/internal/ml/jobs", json={"job_type": "train"})
        assert unauth.status_code == 401

        # 2. Post job authenticated -> 202 Accepted
        resp = client.post(
            "/internal/ml/jobs",
            headers=auth_header,
            json={"job_type": "train", "parameters": {"iterations": 5}},
        )
        assert resp.status_code == 202
        job_data = resp.json()
        assert job_data["job_id"].startswith("job_")
        assert job_data["status"] == "pending"

        # 3. Get job details
        job_id = job_data["job_id"]
        get_resp = client.get(f"/internal/ml/jobs/{job_id}", headers=auth_header)
        assert get_resp.status_code == 200
        assert get_resp.json()["job_id"] == job_id

        # 4. List jobs
        list_resp = client.get("/internal/ml/jobs", headers=auth_header)
        assert list_resp.status_code == 200
        assert len(list_resp.json()) >= 1

        # 5. Monitoring endpoint
        mon_resp = client.get("/internal/ml/monitoring", headers=auth_header)
        assert mon_resp.status_code == 200
        mon_data = mon_resp.json()
        assert "release_health" in mon_data
        assert "job_health" in mon_data
        assert "performance" in mon_data
