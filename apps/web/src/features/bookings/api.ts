import {
  AvailabilityResultSchema,
  BookingListResultSchema,
  BookingResultSchema,
  type AvailabilityResult,
  type BookingListQuery,
  type BookingListResult,
  type BookingResult,
  type CancelBookingRequest,
  type CheckAvailabilityQuery,
  type CreateBookingRequest,
} from "@drivehub/contracts";
import { authedFetch } from "@/lib/api-client";
import { env } from "@/lib/env";

function buildQueryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function checkAvailability(query: CheckAvailabilityQuery): Promise<AvailabilityResult> {
  const res = await fetch(`${env.apiUrl}/bookings/availability${buildQueryString(query)}`, { cache: "no-store" });
  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    throw new Error((details as { message?: string } | undefined)?.message ?? "Failed to check availability");
  }
  return AvailabilityResultSchema.parse(await res.json());
}

export async function createBooking(request: CreateBookingRequest): Promise<BookingResult> {
  return authedFetch("/bookings", { method: "POST", body: JSON.stringify(request) }, (json) =>
    BookingResultSchema.parse(json),
  );
}

export async function fetchMyBookings(query: Partial<BookingListQuery> = {}): Promise<BookingListResult> {
  return authedFetch(`/bookings/mine${buildQueryString(query)}`, undefined, (json) => BookingListResultSchema.parse(json));
}

export async function fetchBookingById(id: string): Promise<BookingResult> {
  return authedFetch(`/bookings/${id}`, undefined, (json) => BookingResultSchema.parse(json));
}

export async function cancelBooking(id: string, request: CancelBookingRequest): Promise<BookingResult> {
  return authedFetch(`/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify(request) }, (json) =>
    BookingResultSchema.parse(json),
  );
}
