import type { Notification } from "@drivehub/database";

export type NotificationEntity = Notification;

export interface CreateNotificationRecordInput {
  customerId: string;
  type: Notification["type"];
  title: string;
  body: string;
  relatedBookingId: string | null;
  relatedPaymentId: string | null;
  relatedInvoiceId: string | null;
}

export interface NotificationListFilters {
  customerId: string;
  unreadOnly: boolean;
  page: number;
  pageSize: number;
}

export interface NotificationListResult {
  items: NotificationEntity[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

export interface NotificationRepository {
  create(input: CreateNotificationRecordInput): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findMany(filters: NotificationListFilters): Promise<NotificationListResult>;
  markRead(id: string): Promise<NotificationEntity>;
}
