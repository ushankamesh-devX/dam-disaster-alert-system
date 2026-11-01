from datetime import UTC, datetime
from typing import Any

import httpx

from app.common.config import Settings


class SpringDataUnavailable(Exception):
    """Sanitized failure: upstream responses and credentials are never exposed."""


class SpringDataClient:
    """Read stored data only through the dedicated authenticated Spring APIs."""

    def __init__(self, client: httpx.AsyncClient, settings: Settings):
        self.client = client
        self.settings = settings

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        if self.settings.spring_service_token is None:
            raise SpringDataUnavailable("Spring data access is not configured")
        try:
            response = await self.client.get(path, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, (dict, list)):
                raise ValueError("Expected a JSON object or array")
            return payload
        except (httpx.HTTPError, ValueError) as exc:
            raise SpringDataUnavailable("Spring data API is unavailable") from exc

    async def get_dams(self) -> Any:
        return await self._get("dams")

    async def get_sensors(self, dam_id: int) -> Any:
        return await self._get(f"dams/{dam_id}/sensors")

    async def get_status(self, dam_id: int) -> Any:
        return await self._get(f"dams/{dam_id}/status")

    async def get_overflow_config(self, dam_id: int) -> Any:
        return await self._get(f"dams/{dam_id}/overflow-config")

    async def get_forecasts(self, dam_id: int, limit: int | None = None) -> Any:
        params = {"limit": limit} if limit is not None else None
        return await self._get(f"dams/{dam_id}/forecasts", params=params)

    async def get_readings(
        self, dam_id: int, start: datetime, end: datetime, cursor: str | None = None
    ) -> Any:
        if start.utcoffset() is None or end.utcoffset() is None:
            raise ValueError("Reading time bounds must include timezone offsets")
        if start > end:
            raise ValueError("Reading start must not be after end")
        params = {
            "from": start.astimezone(UTC).isoformat(),
            "to": end.astimezone(UTC).isoformat(),
        }
        if cursor is not None:
            params["cursor"] = cursor
        return await self._get(f"dams/{dam_id}/readings", params=params)

    async def get_status_history(
        self, dam_id: int, start: datetime, end: datetime, cursor: str | None = None
    ) -> Any:
        if start.utcoffset() is None or end.utcoffset() is None:
            raise ValueError("Status history time bounds must include timezone offsets")
        if start > end:
            raise ValueError("Status history start must not be after end")
        params = {
            "from": start.astimezone(UTC).isoformat(),
            "to": end.astimezone(UTC).isoformat(),
        }
        if cursor is not None:
            params["cursor"] = cursor
        return await self._get(f"dams/{dam_id}/status-history", params=params)

    async def get_weather(
        self,
        dam_id: int,
        start: datetime,
        end: datetime,
        as_of: datetime | None = None,
        cursor: str | None = None,
    ) -> Any:
        if start.utcoffset() is None or end.utcoffset() is None:
            raise ValueError("Weather time bounds must include timezone offsets")
        if start > end:
            raise ValueError("Weather start must not be after end")
        params = {
            "from": start.astimezone(UTC).isoformat(),
            "to": end.astimezone(UTC).isoformat(),
        }
        if as_of is not None:
            if as_of.utcoffset() is None:
                raise ValueError("Weather as_of must include timezone offset")
            params["asOf"] = as_of.astimezone(UTC).isoformat()
        if cursor is not None:
            params["cursor"] = cursor
        return await self._get(f"dams/{dam_id}/weather", params=params)
