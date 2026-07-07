import { PaymentResultSchema, type CreatePaymentRequest, type PaymentResult } from "@drivehub/contracts";
import { authedFetch } from "@/lib/api-client";

export async function createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
  return authedFetch("/payments", { method: "POST", body: JSON.stringify(request) }, (json) =>
    PaymentResultSchema.parse(json),
  );
}

export async function fetchPaymentById(id: string): Promise<PaymentResult> {
  return authedFetch(`/payments/${id}`, undefined, (json) => PaymentResultSchema.parse(json));
}

export async function verifyPayment(id: string): Promise<PaymentResult> {
  return authedFetch(`/payments/${id}/verify`, { method: "POST" }, (json) => PaymentResultSchema.parse(json));
}
