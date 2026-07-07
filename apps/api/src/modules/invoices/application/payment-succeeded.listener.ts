import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { GenerateInvoiceForPaymentUseCase } from "./generate-invoice-for-payment.use-case";

@Injectable()
export class PaymentSucceededListener {
  constructor(private readonly generateInvoice: GenerateInvoiceForPaymentUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    await this.generateInvoice.execute({
      customerId: event.customerId,
      amount: event.amount,
      bookingId: event.bookingId,
      saleTransactionId: event.saleTransactionId,
      description: event.description,
    });
  }
}
