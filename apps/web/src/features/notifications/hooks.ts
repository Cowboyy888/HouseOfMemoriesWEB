"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { fetchMyNotifications, markNotificationRead } from "./api";

export function useMyNotificationsQuery(unreadOnly = false) {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["my-notifications", unreadOnly],
    queryFn: () => fetchMyNotifications({ unreadOnly }),
    enabled: !!session,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    },
  });
}
