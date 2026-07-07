import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateRefundRequest, PaymentResult } from "@drivehub/contracts";
import { PAYMENT_PROVIDER_REGISTRY, type PaymentProviderRegistry } from "../domain/payment-provider.port";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { REFUND_REPOSITORY, type RefundRepository } from "../domain/refund.repository";
import { toPaymentResult } from "./payment.mapper";

const REFUNDABLE_STATUSES = ["SUCCEEDED", "PARTIALLY_REFUNDED"] as const;

/** Staff-only (`payment:refund`) — not exposed to customers. Only counts
 * PROCESSED refunds against the remaining refundable balance; a refund
 * that comes back PENDING from the provider (ABA PayWay always does; Stripe
 * usually doesn't) isn't reconciled by a webhook yet, so a second refund
 * attempt before the first one resolves could over-refund with those
 * providers — see Payments.md's known gaps. */
@Injectable()
export class CreateRefundUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(REFUND_REPOSITORY) private readonly refunds: RefundRepository,
    @Inject(PAYMENT_PROVIDER_REGISTRY) private readonly providers: PaymentProviderRegistry,
  ) {}

  async execute(paymentId: string, request: CreateRefundRequest): Promise<PaymentResult> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} was not found`);
    }
    if (!REFUNDABLE_STATUSES.includes(payment.status as (typeof REFUNDABLE_STATUSES)[number])) {
      throw new BadRequestException(`A payment with status ${payment.status} cannot be refunded`);
    }
    if (!payment.providerPaymentId) {
      throw new BadRequestException("This payment has no provider reference to refund against");
    }

    const alreadyProcessed = await this.refunds.sumProcessed(paymentId);
    const remaining = payment.amount.toNumber() - alreadyProcessed;
    if (request.amount > remaining) {
      throw new BadRequestException(`Refund amount exceeds the remaining refundable balance of ${remaining.toFixed(2)}`);
    }

    const provider = this.providers.get(payment.provider);
    const refundResult = await provider.refundPayment({
      providerPaymentId: payment.providerPaymentId,
      amount: request.amount,
      reason: request.reason,
    });

    const createdRefund = await this.refunds.create({
      paymentId,
      amount: request.amount,
      reason: request.reason,
      status: refundResult.status === "PROCESSED" ? "PROCESSED" : "PENDING",
      providerRefundId: refundResult.providerRefundId,
    });

    const newProcessedTotal = alreadyProcessed + (refundResult.status === "PROCESSED" ? request.amount : 0);
    if (newProcessedTotal >= payment.amount.toNumber()) {
      // updateStatus re-queries with paymentInclude, so its .refunds already
      // reflects the row just created — no need to append it again.
      const updated = await this.payments.updateStatus(paymentId, "REFUNDED");
      return toPaymentResult(updated);
    }
    if (newProcessedTotal > 0) {
      const updated = await this.payments.updateStatus(paymentId, "PARTIALLY_REFUNDED");
      return toPaymentResult(updated);
    }

    return toPaymentResult({ ...payment, refunds: [...payment.refunds, createdRefund] });
  }
}
