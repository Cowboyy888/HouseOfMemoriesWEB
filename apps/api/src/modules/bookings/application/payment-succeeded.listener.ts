import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { ConfirmBookingUseCase } from "./confirm-booking.use-case";

@Injectable()
export class PaymentSucceededListener {
  private readonly logger = new Logger(PaymentSucceededListener.name);

  constructor(private readonly confirmBookingUseCase: ConfirmBookingUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    try {
      if (event.bookingId) {
        await this.confirmBookingUseCase.execute(event.bookingId);
      }
    } catch (error) {
      // Isolated on purpose: emitAsync's Promise.all must resolve regardless
      // of this listener's outcome, or one failure here would also fail the
      // Invoices/Notifications listeners and block their own retry.
      this.logger.error(`Failed to auto-confirm booking for payment ${event.paymentId}`, error instanceof Error ? error.stack : error);
    }
  }
}
