"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatMessage, RecommendationQuery } from "@drivehub/contracts";
import { fetchRecommendations, sendChatMessage } from "./api";

export function useChatMutation() {
  return useMutation({
    mutationFn: (messages: ChatMessage[]) => sendChatMessage(messages),
  });
}

export function useRecommendationsQuery(query: Partial<RecommendationQuery> = {}) {
  return useQuery({
    queryKey: ["ai-recommendations", query],
    queryFn: () => fetchRecommendations(query),
  });
}
