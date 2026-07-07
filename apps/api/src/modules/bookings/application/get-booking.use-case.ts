import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { BookingResult } from "@drivehub/contracts";
import { BOOKING_REPOSITORY, type BookingRepository } from "../domain/booking.repository";
import { toBookingResult } from "./booking.mapper";

@Injectable()
export class GetBookingUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository) {}

  async execute(bookingId: string, requestingCustomerId: string): Promise<BookingResult> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} was not found`);
    }
    if (booking.customerId !== requestingCustomerId) {
      throw new ForbiddenException("You can only view your own bookings");
    }
    return toBookingResult(booking);
  }
}
