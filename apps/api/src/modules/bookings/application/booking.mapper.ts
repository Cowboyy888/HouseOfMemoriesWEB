import type { BookingResult } from "@drivehub/contracts";
import type { BookingEntity } from "../domain/booking.repository";

export function toBookingResult(booking: BookingEntity): BookingResult {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    carId: booking.carId,
    pickupLocationId: booking.pickupLocationId,
    dropoffLocationId: booking.dropoffLocationId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    dailyRate: booking.dailyRate.toString(),
    totalAmount: booking.totalAmount.toString(),
    depositAmount: booking.depositAmount.toString(),
    currency: booking.currency,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    cancellationReason: booking.cancellationReason,
    createdAt: booking.createdAt.toISOString(),
  };
}
