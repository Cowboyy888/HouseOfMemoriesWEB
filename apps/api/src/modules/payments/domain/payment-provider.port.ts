import type { PaymentProviderType } from "@drivehub/contracts";

export interface CreatePaymentInput {
  /** Our internal Payment.id — passed to the provider as a client reference
   * (Stripe metadata, ABA tran_id, KHQR bill number) so a webhook/callback
   * can be reconciled back to the right row without trusting provider state. */
  paymentId: string;
  amount: number;
  currency: "USD" | "KHR";
  description: string;
  customerEmail?: string | null;
}

export type ProviderPaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface CreatePaymentOutput {
  providerPaymentId: string | null;
  status: ProviderPaymentStatus;
  providerMetadata: Record<string, string> | null;
}

export interface VerifyPaymentOutput {
  status: ProviderPaymentStatus;
  providerMetadata?: Record<string, string> | null;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amount: number;
  reason: string;
}

export interface RefundPaymentOutput {
  providerRefundId: string;
  status: "PENDING" | "PROCESSED";
}

/** The Repository/Strategy port from ADR-004 — every provider (Stripe, ABA
 * PayWay, KHQR, Manual) implements this so application code never branches
 * on provider identity. */
export interface PaymentProviderPort {
  readonly provider: PaymentProviderType;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput>;
  verifyPayment(providerPaymentId: string, providerMetadata?: Record<string, string> | null): Promise<VerifyPaymentOutput>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput>;
}

export const PAYMENT_PROVIDER_REGISTRY = Symbol("PAYMENT_PROVIDER_REGISTRY");

export interface PaymentProviderRegistry {
  get(provider: PaymentProviderType): PaymentProviderPort;
}
