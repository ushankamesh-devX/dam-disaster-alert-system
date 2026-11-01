import os
from datetime import UTC, datetime

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.common.config import Settings
from app.main import create_app

INCOMING_TOKEN = "test-only-incoming-service-token-00000001"
OUTGOING_TOKEN = "test-only-spring-service-token-000000002"


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch):
    for key in os.environ:
        if key.startswith("DDAS_AI_"):
            monkeypatch.delenv(key)


def settings(**overrides):
    return Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        **overrides,
    )


def test_public_liveness_and_missing_configuration_fail_closed():
    config = Settings(_env_file=None)
    with TestClient(create_app(config)) as client:
        assert client.get("/health/live").json() == {"status": "up"}
        assert client.get("/health/ready").status_code == 503
        assert client.get("/internal/service/status").status_code == 401
        response = client.get(
            "/internal/service/status", headers={"Authorization": f"Bearer {INCOMING_TOKEN}"}
        )
        assert response.status_code == 503


@pytest.mark.parametrize("authorization", [None, "Basic ignored", "Bearer incorrect"])
def test_service_routes_reject_invalid_credentials(authorization):
    with TestClient(create_app(settings())) as client:
        headers = {"Authorization": authorization} if authorization else {}
        response = client.get("/internal/service/status", headers=headers)
        assert response.status_code == 401
        assert response.headers["WWW-Authenticate"] == "Bearer"
        assert client.get("/future/protected/route", headers=headers).status_code == 401


def test_correct_token_and_dev_docs_security_metadata():
    with TestClient(create_app(settings(enable_docs=True))) as client:
        response = client.get(
            "/internal/service/status", headers={"Authorization": f"Bearer {INCOMING_TOKEN}"}
        )
        assert response.status_code == 200
        assert response.json()["features"]["forecasting"] in ["not_implemented", "active"]
        assert client.get("/docs").status_code == 200
        schema = client.get("/openapi.json").json()
        assert schema["paths"]["/internal/data/dams"]["get"]["security"] == [{"ServiceBearer": []}]
        assert "security" not in schema["paths"]["/health/live"]["get"]


def test_docs_are_disabled_by_default():
    with TestClient(create_app(settings())) as client:
        response = client.get("/docs", headers={"Authorization": f"Bearer {INCOMING_TOKEN}"})
        assert response.status_code == 404


def test_data_client_uses_dedicated_api_and_separate_outgoing_token():
    calls = []

    def respond(request):
        calls.append(request)
        assert request.url.path == "/api/v1/internal/ml/dams"
        assert request.headers["Authorization"] == f"Bearer {OUTGOING_TOKEN}"
        return httpx.Response(200, json={"data": [{"id": 1}]})

    transport = httpx.MockTransport(respond)
    with TestClient(create_app(settings(), spring_transport=transport)) as client:
        assert client.get("/health/ready").json() == {"status": "ready"}
        response = client.get(
            "/internal/data/dams", headers={"Authorization": f"Bearer {INCOMING_TOKEN}"}
        )
        assert response.json() == {"data": [{"id": 1}]}
    assert len(calls) == 2


@pytest.mark.parametrize("status", [401, 403, 404, 500, 302])
def test_upstream_errors_are_sanitized_and_redirects_not_followed(status):
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(
            status,
            text="private upstream details",
            headers={"Location": "https://untrusted.example/"},
        )

    with TestClient(
        create_app(settings(), spring_transport=httpx.MockTransport(respond))
    ) as client:
        response = client.get(
            "/internal/data/dams", headers={"Authorization": f"Bearer {INCOMING_TOKEN}"}
        )
        assert response.status_code == 503
        assert "private upstream details" not in response.text
        assert OUTGOING_TOKEN not in response.text
        assert client.get("/health/ready").status_code == 503
    assert len(calls) == 2
    assert all(call.url.host == "127.0.0.1" for call in calls)


def test_network_failure_reports_not_ready():
    def respond(request):
        raise httpx.ConnectError("connection unavailable", request=request)

    with TestClient(
        create_app(settings(), spring_transport=httpx.MockTransport(respond))
    ) as client:
        assert client.get("/health/ready").status_code == 503


def test_readings_have_utc_bounds_and_use_export_route():
    def respond(request):
        assert request.url.path == "/api/v1/internal/ml/dams/1/readings"
        assert request.url.params["from"] == "2026-10-01T00:00:00+00:00"
        assert request.url.params["to"] == "2026-10-02T00:00:00+00:00"
        assert request.url.params["cursor"] == "page-2"
        return httpx.Response(200, json={"data": [], "nextCursor": None})

    with TestClient(
        create_app(settings(), spring_transport=httpx.MockTransport(respond))
    ) as client:
        data_client = client.app.state.spring_data
        response = client.portal.call(
            data_client.get_readings,
            1,
            datetime(2026, 10, 1, tzinfo=UTC),
            datetime(2026, 10, 2, tzinfo=UTC),
            "page-2",
        )
        assert response["data"] == []
        with pytest.raises(ValueError, match="timezone"):
            client.portal.call(
                data_client.get_readings, 1, datetime(2026, 10, 1), datetime(2026, 10, 2)
            )


def test_status_history_and_weather_use_export_routes():
    calls = []

    def respond(request):
        calls.append(request)
        if "status-history" in request.url.path:
            assert request.url.path == "/api/v1/internal/ml/dams/1/status-history"
            assert request.url.params["from"] == "2026-10-01T00:00:00+00:00"
            assert request.url.params["to"] == "2026-10-02T00:00:00+00:00"
            return httpx.Response(200, json={"data": [], "nextCursor": None})
        if "weather" in request.url.path:
            assert request.url.path == "/api/v1/internal/ml/dams/1/weather"
            assert request.url.params["asOf"] == "2026-10-01T12:00:00+00:00"
            return httpx.Response(200, json={"data": [], "nextCursor": None})
        return httpx.Response(404)

    with TestClient(
        create_app(settings(), spring_transport=httpx.MockTransport(respond))
    ) as client:
        data_client = client.app.state.spring_data
        history = client.portal.call(
            data_client.get_status_history,
            1,
            datetime(2026, 10, 1, tzinfo=UTC),
            datetime(2026, 10, 2, tzinfo=UTC),
        )
        assert history["data"] == []

        weather = client.portal.call(
            data_client.get_weather,
            1,
            datetime(2026, 10, 1, tzinfo=UTC),
            datetime(2026, 10, 2, tzinfo=UTC),
            datetime(2026, 10, 1, 12, tzinfo=UTC),
        )
        assert weather["data"] == []
    assert len(calls) == 2


def test_data_url_cannot_target_sensor_ingestion_or_include_credentials():
    for url in (
        "http://localhost:8080/api/v1/device",
        "http://user:password@localhost:8080/api/v1/internal/ml",
    ):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, spring_data_base_url=url)
