import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { CreateNotificationUseCase } from "./create-notification.use-case";

@Injectable()
export class PaymentSucceededListener {
  private readonly logger = new Logger(PaymentSucceededListener.name);

  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    try {
      await this.createNotification.execute({
        customerId: event.customerId,
        type: "PAYMENT_SUCCEEDED",
        title: "Payment received",
        body: `We received your payment of $${event.amount.toFixed(2)}.`,
        relatedPaymentId: event.paymentId,
        relatedBookingId: event.bookingId,
      });
    } catch (error) {
      // Isolated on purpose: emitAsync's Promise.all must resolve regardless
      // of this listener's outcome, or one failure here would also fail the
      // Bookings/Invoices listeners and block their own retry.
      this.logger.error(`Failed to create payment-succeeded notification for payment ${event.paymentId}`, error instanceof Error ? error.stack : error);
    }
  }
}
