import { Inject, Injectable } from "@nestjs/common";
import type { BookingListQuery, BookingListResult } from "@drivehub/contracts";
import { BOOKING_REPOSITORY, type BookingRepository } from "../domain/booking.repository";
import { toBookingResult } from "./booking.mapper";

@Injectable()
export class ListMyBookingsUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository) {}

  async execute(customerId: string, query: BookingListQuery): Promise<BookingListResult> {
    const result = await this.bookings.findMany({
      customerId,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: result.items.map(toBookingResult),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
