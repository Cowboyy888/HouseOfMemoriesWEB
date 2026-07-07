export const PAYMENT_SUCCEEDED_EVENT = "payment.succeeded";

/** Emitted by Payments whenever a Payment transitions to SUCCEEDED — a
 * plain DTO, not Payments' own PaymentEntity, so listeners in other modules
 * never depend on Payments' internal Prisma-shaped type. */
export interface PaymentSucceededEvent {
  paymentId: string;
  customerId: string;
  amount: number;
  bookingId: string | null;
  saleTransactionId: string | null;
  paymentScheduleId: string | null;
  description: string;
}
