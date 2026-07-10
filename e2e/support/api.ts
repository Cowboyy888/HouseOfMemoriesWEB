import type { APIRequestContext, APIResponse } from "@playwright/test";
import {
  BookingResultSchema,
  CarListResponseSchema,
  InvoiceListResultSchema,
  PaymentResultSchema,
  type BookingResult,
  type CarSummary,
  type InvoiceListResult,
  type PaymentResult,
} from "@drivehub/contracts";
import { API_URL } from "./urls";

const SEEDED_CAMRY_VIN = "4T1B11HK5KU123456";

async function okJson(res: APIResponse, label: string): Promise<unknown> {
  if (!res.ok()) {
    throw new Error(`${label} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

/**
 * These call the real API directly (no browser) — used for fixture setup
 * and for the staff-side actions neither app has a UI for yet
 * (payments/:id/confirm-manual has no admin UI; see Testing-Strategy.md).
 * Each helper takes its own `APIRequestContext` so a test can hold two
 * independent sessions (e.g. a customer's and staff's) at once.
 */
export async function signUp(
  request: APIRequestContext,
  input: { name: string; email: string; password: string },
): Promise<void> {
  const res = await request.post(`${API_URL}/auth/sign-up/email`, { data: input });
  await okJson(res, "sign-up");
}

export async function signIn(request: APIRequestContext, input: { email: string; password: string }): Promise<void> {
  const res = await request.post(`${API_URL}/auth/sign-in/email`, { data: input });
  await okJson(res, "sign-in");
}

export async function fetchSeededCamry(request: APIRequestContext): Promise<CarSummary> {
  const res = await request.get(`${API_URL}/cars?brandSlug=toyota`);
  const body = CarListResponseSchema.parse(await okJson(res, "list cars"));
  const camry = body.items.find((car) => car.vin === SEEDED_CAMRY_VIN);
  if (!camry) {
    throw new Error(`Seeded Camry (VIN ${SEEDED_CAMRY_VIN}) was not found — is the local dev DB seeded?`);
  }
  return camry;
}

export async function createBooking(
  request: APIRequestContext,
  input: { carId: string; locationId: string; startDate: string; endDate: string },
): Promise<BookingResult> {
  const res = await request.post(`${API_URL}/bookings`, {
    data: {
      carId: input.carId,
      pickupLocationId: input.locationId,
      dropoffLocationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
  return BookingResultSchema.parse(await okJson(res, "create booking"));
}

export async function createManualBankTransferPayment(
  request: APIRequestContext,
  input: { payableId: string; amount: number },
): Promise<PaymentResult> {
  const res = await request.post(`${API_URL}/payments`, {
    data: {
      amount: input.amount,
      currency: "USD",
      method: "BANK_TRANSFER",
      provider: "MANUAL",
      payableType: "BOOKING",
      payableId: input.payableId,
      idempotencyKey: crypto.randomUUID(),
    },
  });
  return PaymentResultSchema.parse(await okJson(res, "create payment"));
}

export async function confirmManualPayment(request: APIRequestContext, paymentId: string): Promise<PaymentResult> {
  const res = await request.post(`${API_URL}/payments/${paymentId}/confirm-manual`);
  return PaymentResultSchema.parse(await okJson(res, "confirm manual payment"));
}

export async function getBooking(request: APIRequestContext, id: string): Promise<BookingResult> {
  const res = await request.get(`${API_URL}/bookings/${id}`);
  return BookingResultSchema.parse(await okJson(res, "get booking"));
}

export async function cancelBooking(request: APIRequestContext, id: string, reason: string): Promise<BookingResult> {
  const res = await request.post(`${API_URL}/bookings/${id}/cancel`, { data: { reason } });
  return BookingResultSchema.parse(await okJson(res, "cancel booking"));
}

export async function getMyInvoices(request: APIRequestContext): Promise<InvoiceListResult> {
  const res = await request.get(`${API_URL}/invoices/mine`);
  return InvoiceListResultSchema.parse(await okJson(res, "list my invoices"));
}
