import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PAYMENT_SUCCEEDED_EVENT, type PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import {
  INSTALLMENT_SCHEDULE_REPOSITORY,
  type InstallmentScheduleRepository,
} from "../domain/installment-schedule.repository";
import type { PaymentEntity } from "../domain/payment.repository";

function describePayment(payment: PaymentEntity): string {
  const reference = payment.id.slice(0, 8).toUpperCase();
  if (payment.bookingId) return `Booking deposit — Payment ${reference}`;
  if (payment.saleTransactionId) return `Sale payment — Payment ${reference}`;
  return `Installment payment — Payment ${reference}`;
}

/**
 * Reacts to a Payment transitioning to SUCCEEDED — called from
 * CreatePaymentUseCase (rare synchronous success), VerifyPaymentUseCase,
 * ReconcilePaymentWebhookUseCase, and ConfirmManualPaymentUseCase, all of
 * which already know they're looking at a fresh PENDING->SUCCEEDED
 * transition before calling this (so it's not re-run on every unrelated
 * status read).
 *
 * Handles the one side effect that's genuinely Payments' own domain
 * (crediting a PaymentSchedule installment) directly, then emits
 * `PaymentSucceededEvent` for everyone else — Bookings (auto-confirm),
 * Invoices (receipt generation), and Notifications all listen for this
 * instead of being called directly. This replaced a growing list of direct
 * cross-module imports (`PaymentsModule` importing `BookingsModule` then
 * `InvoicesModule`) the moment a third consumer (Notifications) showed up —
 * exactly the threshold ADR-015/016 flagged in advance for introducing an
 * event bus instead of continuing to add imports.
 *
 * A cash Sale payment succeeding doesn't drive any SaleTransaction status
 * transition yet — there's no Sales module (Car Sales workflow is a later
 * phase per Vision.md's roadmap) to own that business rule, unlike Bookings
 * which already exists. Documented as a known gap rather than guessed.
 */
@Injectable()
export class HandlePaymentSuccessUseCase {
  constructor(
    @Inject(INSTALLMENT_SCHEDULE_REPOSITORY) private readonly schedules: InstallmentScheduleRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(payment: PaymentEntity): Promise<void> {
    if (payment.paymentScheduleId) {
      await this.schedules.recordPayment(payment.paymentScheduleId, payment.amount.toNumber());
    }

    const event: PaymentSucceededEvent = {
      paymentId: payment.id,
      customerId: payment.paidByCustomerId,
      amount: payment.amount.toNumber(),
      bookingId: payment.bookingId,
      saleTransactionId: payment.saleTransactionId,
      paymentScheduleId: payment.paymentScheduleId,
      description: describePayment(payment),
    };
    await this.events.emitAsync(PAYMENT_SUCCEEDED_EVENT, event);
  }
}
