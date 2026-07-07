import type { NotificationResult } from "@drivehub/contracts";
import type { NotificationEntity } from "../domain/notification.repository";

export function toNotificationResult(notification: NotificationEntity): NotificationResult {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    relatedBookingId: notification.relatedBookingId,
    relatedPaymentId: notification.relatedPaymentId,
    relatedInvoiceId: notification.relatedInvoiceId,
    createdAt: notification.createdAt.toISOString(),
  };
}
