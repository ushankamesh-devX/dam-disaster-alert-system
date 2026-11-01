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

export async function askAssistant(query: string, damId?: number | null, signal?: AbortSignal): Promise<AiChatResponse> {
  const question = query.trim();
  if (!question || question.length > 2000) throw new Error('Enter a question of up to 2,000 characters.');
  const response = await aiService.chat({ query: question, ...(damId != null ? { dam_id: damId } : {}) }, signal);
  const result = response.data.data;
  if (!result || typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('No answer was returned. Please try again.');
  if (damId != null && result.dam_id !== damId) throw new Error('The answer did not match your selected dam. Please try again.');
  return result;
}

export const aiService = {
  chat: (data: AiChatRequest, signal?: AbortSignal) =>
    axiosInstance.post<{ success: boolean; data: AiChatResponse }>(
      ENDPOINTS.AI.CHAT, data, { timeout: 75000, signal }
    ),
};
