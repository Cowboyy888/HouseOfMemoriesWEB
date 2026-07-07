import {
  NotificationListResultSchema,
  NotificationResultSchema,
  type NotificationListQuery,
  type NotificationListResult,
  type NotificationResult,
} from "@drivehub/contracts";
import { authedFetch } from "@/lib/api-client";

function buildQueryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMyNotifications(query: Partial<NotificationListQuery> = {}): Promise<NotificationListResult> {
  return authedFetch(`/notifications/mine${buildQueryString(query)}`, undefined, (json) =>
    NotificationListResultSchema.parse(json),
  );
}

export async function markNotificationRead(id: string): Promise<NotificationResult> {
  return authedFetch(`/notifications/${id}/read`, { method: "POST" }, (json) => NotificationResultSchema.parse(json));
}
