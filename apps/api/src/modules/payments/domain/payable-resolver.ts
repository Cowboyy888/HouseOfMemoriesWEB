import type { PayableType } from "@drivehub/contracts";

export interface ResolvedPayable {
  ownerCustomerId: string;
  /** What's still owed on this payable right now — a Booking's deposit, a
   * PaymentSchedule installment's remaining balance, or a cash Sale's
   * remaining price (each net of already-SUCCEEDED payments). Payments
   * must match this exactly; see CreatePaymentUseCase. */
  amountDue: number;
}

export const PAYABLE_RESOLVER = Symbol("PAYABLE_RESOLVER");

/** Looks up the booking/sale/payment-schedule a payment is for, without the
 * Payments module depending on those modules' own use-cases — Booking
 * Workflow (Sprint 6 Module 2) owns the real domain logic for those
 * entities; this only needs to know who is allowed to pay for one. */
export interface PayableResolver {
  resolve(payableType: PayableType, payableId: string): Promise<ResolvedPayable | null>;
}
