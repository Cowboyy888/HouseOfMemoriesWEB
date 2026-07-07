import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { CreateNotificationUseCase } from "./create-notification.use-case";

@Injectable()
export class PaymentSucceededListener {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    await this.createNotification.execute({
      customerId: event.customerId,
      type: "PAYMENT_SUCCEEDED",
      title: "Payment received",
      body: `We received your payment of $${event.amount.toFixed(2)}.`,
      relatedPaymentId: event.paymentId,
      relatedBookingId: event.bookingId,
    });
  }
}
