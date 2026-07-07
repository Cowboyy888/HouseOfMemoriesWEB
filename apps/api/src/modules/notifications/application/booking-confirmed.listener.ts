import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BOOKING_CONFIRMED_EVENT, type BookingConfirmedEvent } from "../../../shared/events/booking-confirmed.event";
import { CreateNotificationUseCase } from "./create-notification.use-case";

@Injectable()
export class BookingConfirmedListener {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent(BOOKING_CONFIRMED_EVENT)
  async handle(event: BookingConfirmedEvent): Promise<void> {
    await this.createNotification.execute({
      customerId: event.customerId,
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed",
      body: `Your booking ${event.bookingNumber} is confirmed.`,
      relatedBookingId: event.bookingId,
    });
  }
}
