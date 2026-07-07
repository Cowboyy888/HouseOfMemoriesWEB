import type { PaymentResult } from "@drivehub/contracts";
import type { PaymentEntity } from "../domain/payment.repository";

export function toPaymentResult(payment: PaymentEntity): PaymentResult {
  return {
    id: payment.id,
    amount: payment.amount.toString(),
    currency: payment.currency,
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    providerPaymentId: payment.providerPaymentId,
    providerMetadata: (payment.providerMetadata as Record<string, string> | null) ?? null,
    refunds: payment.refunds.map((refund) => ({
      id: refund.id,
      paymentId: refund.paymentId,
      amount: refund.amount.toString(),
      reason: refund.reason,
      status: refund.status,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt.toISOString(),
    })),
    createdAt: payment.createdAt.toISOString(),
  };
}
