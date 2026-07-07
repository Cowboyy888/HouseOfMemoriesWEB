import { z } from "zod";

export const PaymentMethodSchema = z.enum(["CARD", "BANK_TRANSFER", "CASH", "QR_CODE"]);
export type PaymentMethodType = z.infer<typeof PaymentMethodSchema>;

export const PaymentProviderSchema = z.enum(["STRIPE", "MANUAL", "ABA_PAYWAY", "KHQR"]);
export type PaymentProviderType = z.infer<typeof PaymentProviderSchema>;

export const PaymentStatusSchema = z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]);
export type PaymentStatusType = z.infer<typeof PaymentStatusSchema>;

// Exactly one of these three identifies what the payment is for — mirrors
// the nullable-FK-triplet on the Payment model (see finance.prisma).
export const PayableTypeSchema = z.enum(["BOOKING", "SALE", "PAYMENT_SCHEDULE"]);
export type PayableType = z.infer<typeof PayableTypeSchema>;

export const CreatePaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  method: PaymentMethodSchema,
  provider: PaymentProviderSchema,
  payableType: PayableTypeSchema,
  payableId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
});
export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

// Provider-specific extras the frontend needs to actually complete the
// payment — a Stripe client secret for Elements, a KHQR string to render as
// a QR code, an ABA PayWay checkout URL to redirect to. Never contains raw
// card data or provider secrets.
export const PaymentProviderMetadataSchema = z
  .object({
    clientSecret: z.string().optional(),
    qr: z.string().optional(),
    md5: z.string().optional(),
    checkoutUrl: z.string().optional(),
    deeplink: z.string().optional(),
    bankInstructions: z.string().optional(),
  })
  .nullable();

export const RefundStatusSchema = z.enum(["PENDING", "PROCESSED", "REJECTED"]);
export type RefundStatusType = z.infer<typeof RefundStatusSchema>;

export const RefundResultSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  amount: z.string(),
  reason: z.string(),
  status: RefundStatusSchema,
  providerRefundId: z.string().nullable(),
  createdAt: z.string(),
});
export type RefundResult = z.infer<typeof RefundResultSchema>;

export const CreateRefundRequestSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});
export type CreateRefundRequest = z.infer<typeof CreateRefundRequestSchema>;

export const PaymentResultSchema = z.object({
  id: z.string(),
  amount: z.string(),
  currency: z.string(),
  method: PaymentMethodSchema,
  provider: PaymentProviderSchema,
  status: PaymentStatusSchema,
  providerPaymentId: z.string().nullable(),
  providerMetadata: PaymentProviderMetadataSchema,
  refunds: z.array(RefundResultSchema),
  createdAt: z.string(),
});
export type PaymentResult = z.infer<typeof PaymentResultSchema>;

export const VerifyPaymentRequestSchema = z.object({
  paymentId: z.string().uuid(),
});
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;
