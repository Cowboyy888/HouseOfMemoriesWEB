import { Inject, Injectable } from "@nestjs/common";
import type { Notification } from "@drivehub/database";
import { CUSTOMER_CONTACT_RESOLVER, type CustomerContactResolver } from "../domain/customer-contact-resolver";
import { EMAIL_SENDER, type EmailSender } from "../domain/email-sender";
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from "../domain/notification.repository";

export interface CreateNotificationInput {
  customerId: string;
  type: Notification["type"];
  title: string;
  body: string;
  relatedBookingId?: string | null;
  relatedPaymentId?: string | null;
  relatedInvoiceId?: string | null;
}

/** Internal-only — called from domain-event listeners, never from a
 * controller (nothing creates an arbitrary notification over HTTP). Always
 * writes the in-app row first, then best-effort emails it; email failing
 * or being unconfigured never rolls back or blocks the in-app one. */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CUSTOMER_CONTACT_RESOLVER) private readonly contacts: CustomerContactResolver,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async execute(input: CreateNotificationInput): Promise<void> {
    await this.notifications.create({
      customerId: input.customerId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedBookingId: input.relatedBookingId ?? null,
      relatedPaymentId: input.relatedPaymentId ?? null,
      relatedInvoiceId: input.relatedInvoiceId ?? null,
    });

    const email = await this.contacts.resolveEmail(input.customerId);
    if (email) {
      await this.emailSender.send(email, input.title, input.body);
    }
  }
}
