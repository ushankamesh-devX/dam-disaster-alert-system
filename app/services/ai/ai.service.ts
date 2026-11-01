import { axiosInstance, ENDPOINTS } from "../api";

export interface AiChatRequest {
  query: string;
  dam_id?: number;
}

export interface AiChatResponse {
  query: string;
  answer: string;
  sources: Record<string, unknown>[];
  dam_id: number | null;
  generated_at: string;
  telemetry?: Record<string, unknown> | null;
  overflow_config?: Record<string, unknown> | null;
  forecasts?: Record<string, unknown>[] | null;
  sensors?: Record<string, unknown>[] | null;
  chart_data?: Record<string, unknown> | null;
}

export const aiService = {
  chat: (data: AiChatRequest) =>
    axiosInstance.post<{ success: boolean; data: AiChatResponse }>(
      ENDPOINTS.AI.CHAT, data, { timeout: 75000 }
    ),
};
