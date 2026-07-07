import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { BookingResult } from "@drivehub/contracts";
import { BOOKING_CANCELLED_EVENT, type BookingCancelledEvent } from "../../../shared/events/booking-cancelled.event";
import { BOOKING_REPOSITORY, type BookingRepository } from "../domain/booking.repository";
import { toBookingResult } from "./booking.mapper";

const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"] as const;

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(bookingId: string, requestingCustomerId: string, reason: string): Promise<BookingResult> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} was not found`);
    }
    if (booking.customerId !== requestingCustomerId) {
      throw new ForbiddenException("You can only cancel your own bookings");
    }
    if (!CANCELLABLE_STATUSES.includes(booking.status as (typeof CANCELLABLE_STATUSES)[number])) {
      throw new BadRequestException(`A booking with status ${booking.status} can no longer be cancelled`);
    }

    const cancelled = await this.bookings.cancel(bookingId, reason);

    const event: BookingCancelledEvent = {
      bookingId: cancelled.id,
      customerId: cancelled.customerId,
      bookingNumber: cancelled.bookingNumber,
      reason,
    };
    await this.events.emitAsync(BOOKING_CANCELLED_EVENT, event);

    return toBookingResult(cancelled);
  }
}
