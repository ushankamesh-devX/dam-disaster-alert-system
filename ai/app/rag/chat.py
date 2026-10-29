from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any

from app.rag.retrieval import RAGRetriever, SearchResult
from app.rag.tools import DamToolRegistry

logger = logging.getLogger(__name__)


@dataclass
class DocumentCitation:
    title: str
    doc_id: str
    version: int
    category: str
    excerpt: str
    score: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RAGChatResponse:
    query: str
    answer: str
    sources: list[DocumentCitation]
    dam_id: int | None
    generated_at: str
    telemetry: dict[str, Any] | None = None
    overflow_config: dict[str, Any] | None = None
    forecasts: list[dict[str, Any]] | None = None
    sensors: list[dict[str, Any]] | None = None
    chart_data: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RAGChatEngine:
    """Contextual conversational assistant grounded in verified dam manuals and live operational telemetry."""

    FALLBACK_MODELS = ("gemini-3.5-flash-lite", "gemini-2.5-flash")

    def __init__(
        self,
        retriever: RAGRetriever,
        gemini_api_key: str | None = None,
        chat_model: str = "gemini-3.5-flash-lite",
        spring_base_url: str = "http://127.0.0.1:8080/api/v1/internal/ml/",
        spring_service_token: str | None = None,
    ) -> None:
        self.retriever = retriever
        self.gemini_api_key = gemini_api_key
        self.chat_model = chat_model
        self.spring_base_url = spring_base_url
        self.spring_service_token = spring_service_token
        self._genai_client = None

        self.tool_registry = DamToolRegistry(
            spring_base_url=spring_base_url,
            spring_service_token=spring_service_token,
        )

        if gemini_api_key:
            try:
                from google import genai

                self._genai_client = genai.Client(api_key=gemini_api_key)
                logger.info("Initialized Google GenAI client for RAG chat (%s)", chat_model)
            except Exception as e:
                logger.warning("Could not initialize google-genai client for chat: %s", e)

    def _extract_target_dam_id(self, query: str, dam_id: int | None) -> int | None:
        """Determines target dam ID from explicit parameter or regex in query."""
        if dam_id is not None:
            return dam_id
        match = re.search(r"\bdam\s*#?\s*(\d+)\b", query, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass
        return None

    def _fetch_live_telemetry_summary(self, target_dam_id: int) -> str:
        """Fetches live operational metrics and thresholds for prompt grounding."""
        lines = []
        try:
            status = self.tool_registry._get(f"dams/{target_dam_id}/status")
            if isinstance(status, dict) and "waterLevelMeters" in status:
                lines.append(
                    f"LIVE TELEMETRY (Dam #{target_dam_id}):\n"
                    f"- Current Water Level: {status.get('waterLevelMeters')}m "
                    f"(Full Reservoir Level: {status.get('fullReservoirLevelMeters')}m, "
                    f"Danger Level: {status.get('dangerLevelMeters')}m)\n"
                    f"- Inflow: {status.get('inflowCumecs')} cumecs | Outflow: {status.get('outflowCumecs')} cumecs\n"
                    f"- Storage: {status.get('storageCurrentMcm')} MCM ({status.get('storagePercentage')}%)\n"
                    f"- Spillway Gates: {status.get('gatesOpenCount')} of {status.get('totalGatesCount')} currently open\n"
                    f"- Hazard Status: {str(status.get('hazardStatus')).upper()} (Flood Risk Score: {status.get('floodRiskScore')})\n"
                    f"- Rainfall (1h / 24h): {status.get('rainfallLast1hrMm')}mm / {status.get('rainfallLast24hrMm')}mm\n"
                    f"- Last Reading Recorded: {status.get('lastSensorReadingAt') or status.get('lastUpdated')}"
                )

            overflow = self.tool_registry._get(f"dams/{target_dam_id}/overflow-config")
            if isinstance(overflow, dict) and "fullReservoirLevelMeters" in overflow:
                lines.append(
                    f"OFFICIAL OVERFLOW ELEVATION THRESHOLDS (Dam #{target_dam_id}):\n"
                    f"- Full Reservoir Level (FRL): {overflow.get('fullReservoirLevelMeters')}m\n"
                    f"- Danger / Alert Level: {overflow.get('dangerLevelMeters')}m\n"
                    f"- Verified Spillway Threshold: {overflow.get('verifiedThresholdMeters') or 'Not verified'}m"
                )

            forecasts = self.tool_registry._get(f"dams/{target_dam_id}/forecasts")
            items = forecasts if isinstance(forecasts, list) else []
            if items:
                f_lines = [
                    f"  * {f.get('horizonHours') or f.get('horizon')}h ahead: "
                    f"{f.get('predictedWaterLevel') or f.get('waterLevelMeters')}m "
                    f"(Overflow Risk: {f.get('overflowProbability')})"
                    for f in items[:5]
                ]
                lines.append("ML CATBOOST WATER-LEVEL FORECAST HORIZONS:\n" + "\n".join(f_lines))
        except Exception as e:
            logger.debug("Failed fetching live telemetry summary for dam %s: %s", target_dam_id, e)

        return "\n\n".join(lines)

    def answer_query(
        self,
        query: str,
        dam_id: int | None = None,
        user_role: str | None = None,
    ) -> RAGChatResponse:
        """Retrieves verified document passages and synthesizes an authoritative answer with live telemetry tools."""
        target_dam_id = self._extract_target_dam_id(query, dam_id)
        results: list[SearchResult] = self.retriever.search(query, dam_id=target_dam_id, top_k=3)
        now_str = datetime.now(UTC).isoformat()

        # If no documents match and no LLM client is configured, return document fallback immediately
        if not results and not self._genai_client:
            answer = (
                "No verified standard operating procedures, dam manuals, or emergency action plans "
                "matching your inquiry were found in the active document repository."
            )
            return RAGChatResponse(
                query=query,
                answer=answer,
                sources=[],
                dam_id=target_dam_id,
                generated_at=now_str,
            )

        citations = []
        synthesized_points = []

        for i, res in enumerate(results, 1):
            short_excerpt = res.text[:200] + ("..." if len(res.text) > 200 else "")
            citations.append(
                DocumentCitation(
                    title=res.title,
                    doc_id=res.doc_id,
                    version=res.version,
                    category=res.category,
                    excerpt=short_excerpt,
                    score=res.score,
                )
            )
            synthesized_points.append(f"[{i}] {res.title} (v{res.version}):\n{res.text}")

        points_text = "\n\n".join(synthesized_points)
        live_telemetry_text = self._fetch_live_telemetry_summary(target_dam_id) if target_dam_id else ""

        structured_telemetry = None
        structured_overflow = None
        structured_forecasts = None
        structured_sensors = None
        structured_chart_data = None
        trend_summary_text = ""

        if target_dam_id:
            try:
                t_raw = self.tool_registry._get(f"dams/{target_dam_id}/status")
                if isinstance(t_raw, dict) and "waterLevelMeters" in t_raw:
                    structured_telemetry = t_raw

                o_raw = self.tool_registry._get(f"dams/{target_dam_id}/overflow-config")
                if isinstance(o_raw, dict) and "fullReservoirLevelMeters" in o_raw:
                    structured_overflow = o_raw

                f_raw = self.tool_registry._get(f"dams/{target_dam_id}/forecasts")
                if isinstance(f_raw, list) and f_raw:
                    structured_forecasts = f_raw

                if re.search(r"\bsensor|threshold|device|hardware|gauge|meter\b", query, re.IGNORECASE):
                    s_raw = self.tool_registry._get(f"dams/{target_dam_id}/sensors")
                    if isinstance(s_raw, list) and s_raw:
                        structured_sensors = s_raw

                if re.search(r"\b(graph|chart|trend|history|past|month|change|fluctuation|level over time)\b", query, re.IGNORECASE):
                    hist_tools = [f for f in self.tool_registry.get_tool_functions() if f.__name__ == "get_dam_water_level_history"]
                    if hist_tools:
                        hist_data = hist_tools[0](target_dam_id, days=30)
                        if isinstance(hist_data, dict) and hist_data.get("time_series"):
                            danger_m = (structured_overflow.get("dangerLevelMeters") if structured_overflow else None) or (structured_telemetry.get("dangerLevelMeters") if structured_telemetry else None)
                            frl_m = (structured_overflow.get("fullReservoirLevelMeters") if structured_overflow else None) or (structured_telemetry.get("fullReservoirLevelMeters") if structured_telemetry else None)
                            structured_chart_data = {
                                "type": "water_level_trend",
                                "damId": target_dam_id,
                                "damName": (structured_telemetry.get("name") if structured_telemetry else None) or f"Dam #{target_dam_id}",
                                "days": 30,
                                "startLevel": hist_data.get("start_water_level_meters"),
                                "currentLevel": hist_data.get("current_water_level_meters"),
                                "netChange": hist_data.get("net_change_meters"),
                                "minLevel": hist_data.get("min_water_level_meters"),
                                "maxLevel": hist_data.get("max_water_level_meters"),
                                "dangerLevel": danger_m,
                                "fullReservoirLevel": frl_m,
                                "timeSeries": hist_data.get("time_series", []),
                            }
                            trend_summary_text = (
                                f"HISTORICAL WATER LEVEL TREND (PAST 30 DAYS / THIS MONTH):\n"
                                f"- Initial Level: {hist_data.get('start_water_level_meters')}m (recorded at {hist_data.get('start_date')})\n"
                                f"- Current Level: {hist_data.get('current_water_level_meters')}m (recorded at {hist_data.get('end_date')})\n"
                                f"- Net Change: {hist_data.get('net_change_meters'):+}m\n"
                                f"- Month High: {hist_data.get('max_water_level_meters')}m | Month Low: {hist_data.get('min_water_level_meters')}m\n"
                                f"- Danger Level: {danger_m}m | Full Reservoir Level (FRL): {frl_m}m"
                            )
            except Exception as e:
                logger.debug("Could not populate structured operational metadata: %s", e)

        if self._genai_client:
            try:
                from google.genai import types

                tools = self.tool_registry.get_tool_functions() if self.tool_registry else []
                cfg = types.GenerateContentConfig(
                    system_instruction=(
                        "You are the official Dam Disaster Alert System (DDAS) AI Assistant. "
                        "You advise dam operators, hydraulic engineers, and disaster managers in Sri Lanka.\n"
                        "OPERATIONAL GUIDELINES:\n"
                        "1. When answering inquiries about current water levels, inflows, outflows, open gates, "
                        "ML CatBoost forecast horizons, overflow danger thresholds, or sensors, strictly ground "
                        "your response in the provided LIVE REAL-TIME TELEMETRY and/or call the available tools.\n"
                        "2. When answering procedural questions (gate opening rules, siren alarms, flood actions), "
                        "follow the provided OPERATIONAL DOCUMENTATION PASSAGES strictly.\n"
                        "3. Clearly state specific values and measurement units (meters, cumecs, MCM, mm/hr).\n"
                        "4. If a question asks whether a dam is safe, compare the current water level against the Danger Level "
                        "and Full Reservoir Level (FRL).\n"
                        "5. If information is not available in the context or tools, clearly state that."
                    ),
                    tools=tools if tools else None,
                )

                context_blocks = []
                if live_telemetry_text:
                    context_blocks.append(f"REAL-TIME DATABASE TELEMETRY & FORECASTS:\n{live_telemetry_text}")
                if trend_summary_text:
                    context_blocks.append(trend_summary_text)
                if points_text:
                    context_blocks.append(f"VERIFIED OPERATIONAL DOCUMENTATION (SOPs/EAPs):\n{points_text}")

                context_str = "\n\n".join(context_blocks)
                user_prompt = (
                    f"User Role: {user_role or 'Operator'}\n"
                    f"Dam Context: Dam #{target_dam_id if target_dam_id else 'All Dams'}\n\n"
                    f"{context_str}\n\n"
                    f"USER INQUIRY:\n{query}\n\n"
                    "GROUNDED RESPONSE:"
                )

                # Try configured model first, then fallback to other models if quota/error occurs
                candidate_models = [self.chat_model] + [m for m in self.FALLBACK_MODELS if m != self.chat_model]
                last_err = None
                response = None

                for model_name in candidate_models:
                    try:
                        response = self._genai_client.models.generate_content(
                            model=model_name,
                            contents=user_prompt,
                            config=cfg,
                        )
                        if response and response.text:
                            break
                    except Exception as gen_err:
                        logger.warning("Gemini generation failed on model '%s': %s", model_name, gen_err)
                        last_err = gen_err

                candidate_text = response.text.strip() if (response and response.text) else ""
                if candidate_text:
                    answer = candidate_text
                elif live_telemetry_text:
                    answer = f"Live operational metrics for Dam #{target_dam_id}:\n\n{live_telemetry_text}"
                elif points_text:
                    answer = (
                        f"Based on active operational documentation for "
                        f"{'Dam #' + str(target_dam_id) if target_dam_id else 'all dams'}:\n\n"
                        f"{points_text}\n\n"
                        f"Please verify these instructions against local operational authority "
                        f"before executing actions."
                    )
                else:
                    answer = (
                        "Hello! I am your Dam Disaster Alert System operational assistant. "
                        "I can help you monitor live telemetry, check water levels and storage, view ML overflow forecasts, "
                        "and retrieve verified dam SOPs and emergency procedures. How can I assist you today?"
                    )
            except Exception as e:
                logger.warning("Gemini tool execution/generation failed: %s; falling back to formatted context", e)
                if live_telemetry_text:
                    answer = f"Live operational metrics for Dam #{target_dam_id}:\n\n{live_telemetry_text}"
                elif points_text:
                    answer = (
                        f"Based on active operational documentation for "
                        f"{'Dam #' + str(target_dam_id) if target_dam_id else 'all dams'}:\n\n"
                        f"{points_text}\n\n"
                        f"Please verify these instructions against local operational authority "
                        f"before executing actions."
                    )
                else:
                    answer = (
                        "Hello! I am your Dam Disaster Alert System operational assistant. "
                        "I can help you monitor live telemetry, check water levels and storage, view ML overflow forecasts, "
                        "and retrieve verified dam SOPs and emergency procedures. How can I assist you today?"
                    )
        else:
            if points_text:
                answer = (
                    f"Based on active operational documentation for "
                    f"{'Dam #' + str(target_dam_id) if target_dam_id else 'all dams'}:\n\n"
                    f"{points_text}\n\n"
                    f"Please verify these instructions against local operational authority "
                    f"before executing actions."
                )
            else:
                answer = (
                    "No verified standard operating procedures, dam manuals, or emergency action plans "
                    "matching your inquiry were found in the active document repository."
                )

        return RAGChatResponse(
            query=query,
            answer=answer,
            sources=citations,
            dam_id=target_dam_id,
            generated_at=now_str,
            telemetry=structured_telemetry,
            overflow_config=structured_overflow,
            forecasts=structured_forecasts,
            sensors=structured_sensors,
            chart_data=structured_chart_data,
        )
