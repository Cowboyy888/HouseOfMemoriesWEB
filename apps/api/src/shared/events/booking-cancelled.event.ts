export const BOOKING_CANCELLED_EVENT = "booking.cancelled";

export interface BookingCancelledEvent {
  bookingId: string;
  customerId: string;
  bookingNumber: string;
  reason: string;
}
