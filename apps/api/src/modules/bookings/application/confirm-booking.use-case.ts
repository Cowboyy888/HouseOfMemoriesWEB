import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { BookingResult } from "@drivehub/contracts";
import { BOOKING_CONFIRMED_EVENT, type BookingConfirmedEvent } from "../../../shared/events/booking-confirmed.event";
import { BOOKING_REPOSITORY, type BookingRepository } from "../domain/booking.repository";
import { toBookingResult } from "./booking.mapper";

/** Confirms a PENDING booking once a deposit has been verified — either a
 * staff member calling this directly (gated by `booking:update`, not
 * ownership) after Manual Bank Transfer reconciliation, or
 * `PaymentSucceededListener` reacting to `PaymentSucceededEvent` as a side
 * effect of a deposit payment succeeding (see Payments.md / Invoices.md).
 *
 * Idempotent by design: re-confirming an already-CONFIRMED booking is a
 * no-op, not an error, since both callers above may reasonably invoke this
 * more than once for the same booking (a staff double-click; a webhook
 * re-delivering an already-processed event) — and a no-op deliberately does
 * NOT re-emit `BookingConfirmedEvent`, so Notifications doesn't send a
 * duplicate "your booking is confirmed" message. Any other non-PENDING
 * status (CANCELLED, ACTIVE, COMPLETED, NO_SHOW) still can't be confirmed. */
@Injectable()
export class ConfirmBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(bookingId: string): Promise<BookingResult> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} was not found`);
    }
    if (booking.status === "CONFIRMED") {
      return toBookingResult(booking);
    }
    if (booking.status !== "PENDING") {
      throw new BadRequestException(`Only a PENDING booking can be confirmed (this one is ${booking.status})`);
    }

    const confirmed = await this.bookings.updateStatus(bookingId, "CONFIRMED");

    const event: BookingConfirmedEvent = {
      bookingId: confirmed.id,
      customerId: confirmed.customerId,
      bookingNumber: confirmed.bookingNumber,
    };
    await this.events.emitAsync(BOOKING_CONFIRMED_EVENT, event);

    return toBookingResult(confirmed);
  }
}
