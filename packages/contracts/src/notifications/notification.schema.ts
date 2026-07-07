import { z } from "zod";

export const NotificationTypeSchema = z.enum([
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "PAYMENT_SUCCEEDED",
  "INVOICE_ISSUED",
]);
export type NotificationTypeValue = z.infer<typeof NotificationTypeSchema>;

export const NotificationResultSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  readAt: z.string().nullable(),
  relatedBookingId: z.string().nullable(),
  relatedPaymentId: z.string().nullable(),
  relatedInvoiceId: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationResult = z.infer<typeof NotificationResultSchema>;

export const NotificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const NotificationListResultSchema = z.object({
  items: z.array(NotificationResultSchema),
  total: z.number(),
  unreadCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type NotificationListResult = z.infer<typeof NotificationListResultSchema>;
