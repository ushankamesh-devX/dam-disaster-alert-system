import { axiosInstance, ENDPOINTS } from "../api";

export interface DamForecast {
  id: number;
  damId: number;
  issuedAt: string;
  asOf: string;
  latestReadingAt: string | null;
  freshness: string | null;
  demoMode: boolean | null;
  releaseId: string | null;
  overflowThresholdMeters: number | null;
  overflowConfigVersion: number | null;
  horizonHours: number;
  targetTime: string;
  levelP10: number | null;
  levelP50: number | null;
  levelP90: number | null;
  overflowProbability: number | null;
  overflowProbabilityReason: string | null;
  isPublished: boolean;
  createdAt: string;
}

export const forecastService = {
  getHistory: (damId: string, params?: { from?: string; to?: string; cursor?: string; limit?: number }) =>
    axiosInstance.get<{ success: boolean; data: { data: DamForecast[]; nextCursor: string | null } }>(
      ENDPOINTS.DAMS.FORECAST_HISTORY(damId), { params }
    ),
  // Latest published run. Keep freshness/demoMode visible to the consuming screen.
  getLatest: (damId: string) =>
    axiosInstance.get<{ success: boolean; data: DamForecast[] }>(
      ENDPOINTS.DAMS.FORECASTS(damId)
    ),
};
