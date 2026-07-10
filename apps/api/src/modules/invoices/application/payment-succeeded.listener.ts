import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { GenerateInvoiceForPaymentUseCase } from "./generate-invoice-for-payment.use-case";

@Injectable()
export class PaymentSucceededListener {
  private readonly logger = new Logger(PaymentSucceededListener.name);

  constructor(private readonly generateInvoice: GenerateInvoiceForPaymentUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    try {
      await this.generateInvoice.execute({
        customerId: event.customerId,
        amount: event.amount,
        bookingId: event.bookingId,
        saleTransactionId: event.saleTransactionId,
        description: event.description,
      });
    } catch (error) {
      // Isolated on purpose: emitAsync's Promise.all must resolve regardless
      // of this listener's outcome, or one failure here would also fail the
      // Bookings/Notifications listeners and block their own retry.
      this.logger.error(`Failed to generate invoice for payment ${event.paymentId}`, error instanceof Error ? error.stack : error);
    }
  }
}
