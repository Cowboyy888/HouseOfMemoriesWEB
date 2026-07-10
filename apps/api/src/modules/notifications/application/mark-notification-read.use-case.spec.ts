import { describe, expect, it, vi } from "vitest";
import type { NotificationEntity, NotificationRepository } from "../domain/notification.repository";
import { MarkNotificationReadUseCase } from "./mark-notification-read.use-case";

function makeNotification(overrides: Partial<NotificationEntity> = {}): NotificationEntity {
  return {
    id: "notification-1",
    customerId: "customer-1",
    type: "PAYMENT_SUCCEEDED",
    title: "Payment received",
    body: "We received your payment of $65.00.",
    readAt: null,
    relatedBookingId: null,
    relatedPaymentId: "payment-1",
    relatedInvoiceId: null,
    createdAt: new Date(),
    ...overrides,
  } as NotificationEntity;
}

describe("MarkNotificationReadUseCase", () => {
  it("throws NotFoundException when the notification doesn't exist", async () => {
    const notifications = { findById: vi.fn().mockResolvedValue(null) } as unknown as NotificationRepository;
    const useCase = new MarkNotificationReadUseCase(notifications);

    await expect(useCase.execute("notification-1", "customer-1")).rejects.toThrow(/was not found/);
  });

  it("throws ForbiddenException when the notification belongs to a different customer", async () => {
    const notifications = {
      findById: vi.fn().mockResolvedValue(makeNotification({ customerId: "someone-else" })),
    } as unknown as NotificationRepository;
    const useCase = new MarkNotificationReadUseCase(notifications);

    await expect(useCase.execute("notification-1", "customer-1")).rejects.toThrow(/your own/);
  });

  it("is an idempotent no-op that doesn't call markRead again when the notification is already read", async () => {
    const readAt = new Date();
    const markRead = vi.fn();
    const notifications = {
      findById: vi.fn().mockResolvedValue(makeNotification({ readAt })),
      markRead,
    } as unknown as NotificationRepository;
    const useCase = new MarkNotificationReadUseCase(notifications);

    const result = await useCase.execute("notification-1", "customer-1");

    expect(markRead).not.toHaveBeenCalled();
    expect(result.id).toBe("notification-1");
  });

  it("calls markRead and returns the updated notification when it's unread", async () => {
    const updated = makeNotification({ readAt: new Date() });
    const markRead = vi.fn().mockResolvedValue(updated);
    const notifications = {
      findById: vi.fn().mockResolvedValue(makeNotification({ readAt: null })),
      markRead,
    } as unknown as NotificationRepository;
    const useCase = new MarkNotificationReadUseCase(notifications);

    await useCase.execute("notification-1", "customer-1");

    expect(markRead).toHaveBeenCalledWith("notification-1");
  });
});
