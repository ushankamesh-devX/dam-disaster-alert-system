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

export function getAssistantErrorMessage(error: unknown): string {
  const failure = error as { code?: string; response?: { status?: number; data?: { message?: string } } } | null;
  const status = failure?.response?.status;
  const message = failure?.response?.data?.message;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'Your account does not have access to the AI assistant.';
  if (status === 429) return 'The assistant is busy. Please wait a moment and try again.';
  if (typeof message === 'string' && message.includes('AI service authentication is unconfigured')) {
    return 'AI is not configured on the server yet. Please contact support.';
  }
  if (typeof message === 'string' && message.includes('Failed communicating with AI backend')) {
    return 'The server cannot connect to the AI service. Please try again later.';
  }
  if (status === 502 || status === 503 || status === 504 ||
      (typeof message === 'string' && message.includes('AI backend error:'))) {
    return 'The AI service is temporarily unavailable. Please try again later.';
  }
  if (failure?.code === 'ECONNABORTED' || failure?.code === 'ETIMEDOUT') {
    return 'The assistant took too long to answer. Please try again.';
  }
  return 'Couldn’t get an answer. Check your connection or try again shortly.';
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
