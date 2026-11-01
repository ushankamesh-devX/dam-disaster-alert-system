import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class DamToolRegistry:
    """Provides grounded operational data tools for Gemini LLM function calling."""

    def __init__(
        self,
        spring_base_url: str = "http://127.0.0.1:8080/api/v1/internal/ml/",
        spring_service_token: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.spring_base_url = str(spring_base_url).rstrip("/") + "/"
        self.spring_service_token = spring_service_token or ""
        self.timeout = timeout

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        headers = {}
        if self.spring_service_token:
            headers["Authorization"] = f"Bearer {self.spring_service_token.strip()}"
        try:
            with httpx.Client(
                base_url=self.spring_base_url,
                headers=headers,
                timeout=self.timeout,
            ) as client:
                res = client.get(path, params=params)
                res.raise_for_status()
                payload = res.json()
                return payload.get("data", payload) if isinstance(payload, dict) else payload
        except Exception as e:
            logger.warning("Spring data call to %s failed: %s", path, e)
            return {"error": f"Failed to fetch data from Spring API ({path}): {e}"}

    def get_tool_functions(self) -> list:
        """Returns clean callable tool functions for Gemini AFC (Automatic Function Calling)."""

        def get_all_dams() -> dict:
            """Lists all registered dams and reservoirs in Sri Lanka with basic specifications, capacity, and current status."""
            raw = self._get("dams")
            if isinstance(raw, dict) and "error" in raw:
                return raw
            items = raw if isinstance(raw, list) else []
            dams = []
            for d in items:
                dams.append({
                    "dam_id": d.get("id"),
                    "name": d.get("name"),
                    "code": d.get("code"),
                    "dam_type": d.get("damType"),
                    "height_meters": d.get("heightMeters"),
                    "reservoir_capacity_mcm": d.get("reservoirCapacityMcm"),
                    "status": d.get("status"),
                    "river": d.get("riverName"),
                })
            return {"total_dams": len(dams), "dams": dams}

        def get_dam_live_status(dam_id: int) -> dict:
            """Fetches live telemetry for a specific dam including current water level in meters, storage percentage, inflow, outflow, open gates, and hazard alert status."""
            raw = self._get(f"dams/{dam_id}/status")
            if isinstance(raw, dict) and "error" in raw:
                return raw
            if not isinstance(raw, dict) or not raw:
                return {"dam_id": dam_id, "message": f"No telemetry record found for Dam #{dam_id}"}
            return {
                "dam_id": dam_id,
                "water_level_meters": raw.get("waterLevelMeters"),
                "water_level_percentage": raw.get("waterLevelPercentage"),
                "full_reservoir_level_meters": raw.get("fullReservoirLevelMeters"),
                "danger_level_meters": raw.get("dangerLevelMeters"),
                "inflow_cumecs": raw.get("inflowCumecs"),
                "outflow_cumecs": raw.get("outflowCumecs"),
                "current_storage_mcm": raw.get("storageCurrentMcm"),
                "storage_percentage": raw.get("storagePercentage"),
                "gates_open_count": raw.get("gatesOpenCount"),
                "total_gates_count": raw.get("totalGatesCount"),
                "hazard_status": raw.get("hazardStatus"),
                "flood_risk_score": raw.get("floodRiskScore"),
                "rainfall_last_1hr_mm": raw.get("rainfallLast1hrMm"),
                "rainfall_last_24hr_mm": raw.get("rainfallLast24hrMm"),
                "last_reading_at": raw.get("lastSensorReadingAt") or raw.get("lastUpdated"),
            }

        def get_dam_forecasts(dam_id: int, limit: int = 5) -> dict:
            """Fetches machine learning water level predictions and overflow probabilities across multiple forward horizons (e.g. 6h, 12h, 24h, 48h, 72h)."""
            raw = self._get(f"dams/{dam_id}/forecasts", params={"limit": limit})
            if isinstance(raw, dict) and "error" in raw:
                return raw
            items = raw if isinstance(raw, list) else []
            if not items:
                return {
                    "dam_id": dam_id,
                    "status": f"No active forecast records published yet for Dam #{dam_id}",
                    "forecasts": [],
                }
            forecasts = []
            for f in items:
                forecasts.append({
                    "horizon_hours": f.get("horizonHours") or f.get("horizon"),
                    "predicted_water_level_m": f.get("predictedWaterLevel") or f.get("waterLevelMeters"),
                    "lower_bound_m": f.get("lowerQuantileLevel"),
                    "upper_bound_m": f.get("upperQuantileLevel"),
                    "overflow_probability": f.get("overflowProbability"),
                    "forecast_generated_at": f.get("createdAt") or f.get("forecastTimestamp"),
                })
            return {"dam_id": dam_id, "forecast_count": len(forecasts), "forecasts": forecasts}

        def get_dam_overflow_config(dam_id: int) -> dict:
            """Fetches official dam elevation limits including Full Reservoir Level (FRL), Danger Level, crest elevation, and verified spillway limits."""
            raw = self._get(f"dams/{dam_id}/overflow-config")
            if isinstance(raw, dict) and "error" in raw:
                return raw
            if not isinstance(raw, dict) or not raw:
                return {"dam_id": dam_id, "message": f"No overflow limits defined for Dam #{dam_id}"}
            return {
                "dam_id": dam_id,
                "full_reservoir_level_meters": raw.get("fullReservoirLevelMeters"),
                "danger_level_meters": raw.get("dangerLevelMeters"),
                "verified_threshold_meters": raw.get("verifiedThresholdMeters"),
                "status": raw.get("status"),
                "version": raw.get("version"),
            }

        def get_dam_sensors(dam_id: int) -> dict:
            """Fetches the list of telemetry sensors installed on the dam (water level, rainfall, inflow, soil moisture) with operational warning and critical limits."""
            raw = self._get(f"dams/{dam_id}/sensors")
            if isinstance(raw, dict) and "error" in raw:
                return raw
            items = raw if isinstance(raw, list) else []
            sensors = []
            for s in items:
                sensor_type_code = s.get("sensorType", {}).get("code") if isinstance(s.get("sensorType"), dict) else s.get("unit")
                sensors.append({
                    "sensor_id": s.get("id"),
                    "name": s.get("name"),
                    "sensor_type": sensor_type_code,
                    "unit": s.get("unit"),
                    "status": s.get("status"),
                    "warning_threshold": s.get("warningThreshold"),
                    "critical_threshold": s.get("criticalThreshold"),
                    "last_reading_at": s.get("lastReadingAt"),
                })
            return {"dam_id": dam_id, "sensor_count": len(sensors), "sensors": sensors}

        def get_dam_water_level_history(dam_id: int, days: int = 30) -> dict:
            """Retrieves historical water level readings, net elevation changes, monthly highs and lows, and downsampled time-series points for trend analysis and chart rendering."""
            import datetime

            to_dt = datetime.datetime.now(datetime.timezone.utc)
            from_dt = to_dt - datetime.timedelta(days=max(1, min(days, 90)))
            from_iso = from_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            to_iso = to_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            raw = self._get(f"dams/{dam_id}/readings", params={"from": from_iso, "to": to_iso, "limit": 1000})
            if isinstance(raw, dict) and "error" in raw:
                return raw
            items = raw if isinstance(raw, list) else []

            # Filter for water level readings (unit == 'm')
            wl_readings = [r for r in items if r.get("unit") == "m" and r.get("readingValue") is not None]
            wl_readings.sort(key=lambda r: r.get("recordedAt", ""))

            if not wl_readings:
                return {
                    "dam_id": dam_id,
                    "message": f"No historical water level readings found for Dam #{dam_id} in the past {days} days",
                    "readings_count": 0,
                    "time_series": [],
                }

            start_val = round(float(wl_readings[0]["readingValue"]), 2)
            end_val = round(float(wl_readings[-1]["readingValue"]), 2)
            min_val = round(min(float(r["readingValue"]) for r in wl_readings), 2)
            max_val = round(max(float(r["readingValue"]) for r in wl_readings), 2)
            net_change = round(end_val - start_val, 2)

            # Downsample to ~25-30 representative points for smooth chart rendering
            sample_step = max(1, len(wl_readings) // 30)
            sampled = wl_readings[::sample_step]
            if wl_readings[-1] not in sampled:
                sampled.append(wl_readings[-1])

            points = []
            for r in sampled:
                points.append({
                    "timestamp": r.get("recordedAt"),
                    "water_level_meters": round(float(r.get("readingValue", 0)), 2),
                })

            return {
                "dam_id": dam_id,
                "days_analyzed": days,
                "readings_count": len(wl_readings),
                "start_water_level_meters": start_val,
                "current_water_level_meters": end_val,
                "net_change_meters": net_change,
                "min_water_level_meters": min_val,
                "max_water_level_meters": max_val,
                "start_date": wl_readings[0].get("recordedAt"),
                "end_date": wl_readings[-1].get("recordedAt"),
                "time_series": points,
            }

        return [
            get_all_dams,
            get_dam_live_status,
            get_dam_forecasts,
            get_dam_overflow_config,
            get_dam_sensors,
            get_dam_water_level_history,
        ]
