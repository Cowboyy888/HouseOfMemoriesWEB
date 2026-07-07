import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import { ConfirmBookingUseCase } from "./confirm-booking.use-case";

@Injectable()
export class PaymentSucceededListener {
  constructor(private readonly confirmBookingUseCase: ConfirmBookingUseCase) {}

  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handle(event: PaymentSucceededEvent): Promise<void> {
    if (event.bookingId) {
      await this.confirmBookingUseCase.execute(event.bookingId);
    }
  }
}
