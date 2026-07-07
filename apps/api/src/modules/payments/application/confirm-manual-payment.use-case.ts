import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PaymentResult } from "@drivehub/contracts";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";
import { toPaymentResult } from "./payment.mapper";

/**
 * Manual Bank Transfer has no provider to poll or webhook to receive — a
 * staff member checks the real bank statement and confirms it here. Without
 * this, a Manual payment stays PENDING forever: `amountDue` (computed from
 * SUCCEEDED payments only) would never reflect it as paid, silently
 * allowing unlimited duplicate payment attempts against the same
 * booking/sale/installment. Found by live-testing the deposit flow, not
 * hypothesized in advance — fixed here rather than left as a known gap.
 *
 * Staff-only (`payment:update`). Idempotent: confirming an
 * already-SUCCEEDED payment is a no-op, mirroring ConfirmBookingUseCase.
 */
@Injectable()
export class ConfirmManualPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    private readonly handlePaymentSuccess: HandlePaymentSuccessUseCase,
  ) {}

  async execute(paymentId: string): Promise<PaymentResult> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} was not found`);
    }
    if (payment.provider !== "MANUAL") {
      throw new BadRequestException(
        "Only Manual Bank Transfer payments are confirmed this way — other providers reconcile via /verify or a webhook",
      );
    }
    if (payment.status === "SUCCEEDED") {
      return toPaymentResult(payment);
    }
    if (payment.status !== "PENDING") {
      throw new BadRequestException(`A payment with status ${payment.status} can no longer be confirmed`);
    }

    const updated = await this.payments.updateStatus(paymentId, "SUCCEEDED");
    await this.handlePaymentSuccess.execute(updated);
    return toPaymentResult(updated);
  }
}
