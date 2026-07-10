import { describe, expect, it, vi } from "vitest";
import type { CustomerContactResolver } from "../domain/customer-contact-resolver";
import type { EmailSender } from "../domain/email-sender";
import type { NotificationRepository } from "../domain/notification.repository";
import { CreateNotificationUseCase, type CreateNotificationInput } from "./create-notification.use-case";

const input: CreateNotificationInput = {
  customerId: "customer-1",
  type: "PAYMENT_SUCCEEDED",
  title: "Payment received",
  body: "We received your payment of $65.00.",
  relatedPaymentId: "payment-1",
};

describe("CreateNotificationUseCase", () => {
  it("always writes the in-app notification row first, even before resolving an email address", async () => {
    const calls: string[] = [];
    const notifications = {
      create: vi.fn().mockImplementation(async () => {
        calls.push("create");
        return {};
      }),
    } as unknown as NotificationRepository;
    const contacts = {
      resolveEmail: vi.fn().mockImplementation(async () => {
        calls.push("resolveEmail");
        return null;
      }),
    } as unknown as CustomerContactResolver;
    const emailSender = { send: vi.fn() } as unknown as EmailSender;

    const useCase = new CreateNotificationUseCase(notifications, contacts, emailSender);
    await useCase.execute(input);

    expect(calls).toEqual(["create", "resolveEmail"]);
  });

  it("skips sending an email when the customer has no resolvable email address", async () => {
    const notifications = { create: vi.fn().mockResolvedValue({}) } as unknown as NotificationRepository;
    const contacts = { resolveEmail: vi.fn().mockResolvedValue(null) } as unknown as CustomerContactResolver;
    const emailSender = { send: vi.fn() } as unknown as EmailSender;

    const useCase = new CreateNotificationUseCase(notifications, contacts, emailSender);
    await useCase.execute(input);

    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("sends the email with the notification's title and body when an email address resolves", async () => {
    const notifications = { create: vi.fn().mockResolvedValue({}) } as unknown as NotificationRepository;
    const contacts = {
      resolveEmail: vi.fn().mockResolvedValue("customer@example.com"),
    } as unknown as CustomerContactResolver;
    const emailSender = { send: vi.fn() } as unknown as EmailSender;

    const useCase = new CreateNotificationUseCase(notifications, contacts, emailSender);
    await useCase.execute(input);

    expect(emailSender.send).toHaveBeenCalledWith("customer@example.com", input.title, input.body);
  });

  it("defaults unset relatedX fields to null rather than undefined when creating the row", async () => {
    const create = vi.fn().mockResolvedValue({});
    const notifications = { create } as unknown as NotificationRepository;
    const contacts = { resolveEmail: vi.fn().mockResolvedValue(null) } as unknown as CustomerContactResolver;
    const emailSender = { send: vi.fn() } as unknown as EmailSender;

    const useCase = new CreateNotificationUseCase(notifications, contacts, emailSender);
    await useCase.execute({ customerId: "customer-1", type: "PAYMENT_SUCCEEDED", title: "t", body: "b" });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ relatedBookingId: null, relatedPaymentId: null, relatedInvoiceId: null }),
    );
  });
});
