import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BOOKING_CANCELLED_EVENT, type BookingCancelledEvent } from "../../../shared/events/booking-cancelled.event";
import { CreateNotificationUseCase } from "./create-notification.use-case";

@Injectable()
export class BookingCancelledListener {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent(BOOKING_CANCELLED_EVENT)
  async handle(event: BookingCancelledEvent): Promise<void> {
    await this.createNotification.execute({
      customerId: event.customerId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: `Your booking ${event.bookingNumber} was cancelled: ${event.reason}`,
      relatedBookingId: event.bookingId,
    });
  }
}
