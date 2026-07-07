import {
  ChatResponseSchema,
  RecommendationResultSchema,
  type ChatMessage,
  type ChatResponse,
  type RecommendationQuery,
  type RecommendationResult,
} from "@drivehub/contracts";
import { env } from "@/lib/env";

function buildQueryString(query: Partial<RecommendationQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${env.apiUrl}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error((data as { message?: string } | undefined)?.message ?? "The assistant could not answer right now.");
  }
  return ChatResponseSchema.parse(data);
}

export async function fetchRecommendations(query: Partial<RecommendationQuery> = {}): Promise<RecommendationResult> {
  const res = await fetch(`${env.apiUrl}/ai/recommendations${buildQueryString(query)}`, {
    credentials: "include",
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error((data as { message?: string } | undefined)?.message ?? "Recommendations are unavailable right now.");
  }
  return RecommendationResultSchema.parse(data);
}
