import httpx
import pytest

from app.rag.chat import RAGChatEngine
from app.rag.tools import DamToolRegistry


def forecast(**overrides):
    return {
        "id": 21,
        "damId": 6,
        "horizonHours": 3,
        "isPublished": True,
        "levelP10": 0.0,
        "levelP50": 0.0,
        "levelP90": 1.2,
        "overflowProbability": 0.0,
        "overflowProbabilityReason": None,
        "issuedAt": "2026-11-01T10:00:00",
        "asOf": "2026-11-01T09:55:00",
        "targetTime": "2026-11-01T12:55:00",
        "latestReadingAt": "2026-10-31T08:00:00",
        "freshness": "stale",
        "demoMode": True,
        **overrides,
    }


def get_tool(registry):
    return next(
        tool for tool in registry.get_tool_functions() if tool.__name__ == "get_dam_forecasts"
    )


def test_latest_endpoint_unwraps_list_and_uses_service_auth(monkeypatch):
    original = httpx.Client

    def handler(request):
        assert request.url.path == "/api/v1/internal/ml/dams/6/forecasts/latest"
        assert request.headers["Authorization"] == "Bearer test-service-token"
        return httpx.Response(200, json={"data": [forecast()]})

    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: original(**kwargs, transport=httpx.MockTransport(handler))
    )
    result = get_tool(DamToolRegistry(spring_service_token="test-service-token"))(6)
    row = result["forecasts"][0]
    assert result["status"] == "available"
    assert row["predicted_water_level_m"] == 0
    assert row["lower_bound_m"] == 0
    assert row["upper_bound_m"] == 1.2
    assert row["overflow_probability"] == 0
    assert row["forecast_generated_at"] == "2026-11-01T10:00:00"
    assert row["freshness"] == "stale" and row["demo_mode"] is True
    assert row["latest_reading_at"] == "2026-10-31T08:00:00"


@pytest.mark.parametrize(
    "raw,status",
    [
        ([], "empty"),
        ({"error": "timeout"}, "unavailable"),
        ({"unexpected": []}, "unavailable"),
        ([forecast(damId=9)], "unavailable"),
        ([forecast(isPublished=False)], "empty"),
    ],
)
def test_empty_unavailable_and_wrong_dam_are_distinct(monkeypatch, raw, status):
    registry = DamToolRegistry()
    monkeypatch.setattr(registry, "_get", lambda *args, **kwargs: raw)
    result = get_tool(registry)(6)
    assert result["status"] == status
    if status == "unavailable":
        assert "error" in result
        assert "forecasts" not in result
    else:
        assert result["forecasts"] == []


def test_stored_horizons_are_sorted_and_missing_values_are_not_zero(monkeypatch):
    registry = DamToolRegistry()
    monkeypatch.setattr(
        registry,
        "_get",
        lambda *args, **kwargs: [
            forecast(horizonHours=12),
            forecast(horizonHours=1, levelP50=None),
        ],
    )
    result = get_tool(registry)(6, limit=1)
    assert result["forecasts"][0]["horizon_hours"] == 1
    assert result["forecasts"][0]["predicted_water_level_m"] is None


class EmptyRetriever:
    def search(self, *args, **kwargs):
        return []


@pytest.mark.parametrize(
    "raw,expected",
    [
        ([forecast()], "median 0.0 m"),
        ([], "no published forecast"),
        ({"error": "timeout"}, "could not be retrieved"),
    ],
)
def test_forecast_chat_without_documents_or_llm_uses_data(monkeypatch, raw, expected):
    engine = RAGChatEngine(EmptyRetriever())
    calls = []

    def fetch(path, **kwargs):
        calls.append(path)
        return raw if path.endswith("forecasts/latest") else {}

    monkeypatch.setattr(engine.tool_registry, "_get", fetch)
    response = engine.answer_query("Show my dam forecast", dam_id=6)
    assert expected in response.answer
    assert calls.count("dams/6/forecasts/latest") == 1
    if isinstance(raw, list):
        assert response.forecasts == raw
        if raw:
            assert "stale" in response.answer and "demo: True" in response.answer
            assert "P10-P90 range 0.0-1.2 m" in response.answer
    else:
        assert response.forecasts is None
