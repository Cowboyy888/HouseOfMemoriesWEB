import type { Booking, Prisma } from "@drivehub/database";

export type BookingEntity = Booking;

export interface CreateBookingRecordInput {
  bookingNumber: string;
  customerId: string;
  carId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
}

export interface BookingListFilters {
  customerId: string;
  status?: Prisma.BookingWhereInput["status"];
  page: number;
  pageSize: number;
}

export interface BookingListResult {
  items: BookingEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export const BOOKING_REPOSITORY = Symbol("BOOKING_REPOSITORY");

export interface BookingRepository {
  /** Also creates the linked AvailabilityBlock row (reason BOOKED) in the
   * same transaction. Throws BookingOverlapError if the DB's GiST exclusion
   * constraint rejects the insert (see raw_sql_constraints migration). */
  create(input: CreateBookingRecordInput): Promise<BookingEntity>;
  findById(id: string): Promise<BookingEntity | null>;
  findMany(filters: BookingListFilters): Promise<BookingListResult>;
  updateStatus(id: string, status: Prisma.BookingUpdateInput["status"]): Promise<BookingEntity>;
  /** Sets status to CANCELLED and deletes the linked AvailabilityBlock (if
   * any) in the same transaction — the car's calendar shouldn't keep
   * showing a hold for a booking that no longer exists. The exclusion
   * constraint on `bookings` already stops counting a CANCELLED row on its
   * own (its WHERE clause only covers PENDING/CONFIRMED/ACTIVE); this just
   * keeps AvailabilityBlock from going stale alongside it. */
  cancel(id: string, reason: string): Promise<BookingEntity>;
}

/** Thrown when the database's exclusion constraint rejects an overlapping
 * booking that the application-level pre-check missed (a genuine race
 * between two concurrent requests for the same car/date range). */
export class BookingOverlapError extends Error {
  constructor() {
    super("This car is no longer available for the selected dates");
  }
}
