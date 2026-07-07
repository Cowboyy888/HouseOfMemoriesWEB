export const BOOKING_CONFIRMED_EVENT = "booking.confirmed";

export interface BookingConfirmedEvent {
  bookingId: string;
  customerId: string;
  bookingNumber: string;
}
