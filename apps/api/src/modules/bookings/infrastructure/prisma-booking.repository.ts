import { Injectable } from "@nestjs/common";
import type { Prisma } from "@drivehub/database";
import { PrismaService } from "../../../shared/database/prisma.service";
import {
  BookingOverlapError,
  type BookingEntity,
  type BookingListFilters,
  type BookingListResult,
  type BookingRepository,
  type CreateBookingRecordInput,
} from "../domain/booking.repository";

/** Two SQLSTATEs observed from the `no_overlapping_bookings` GiST exclusion
 * constraint under real concurrency (see raw_sql_constraints migration):
 * `23P01` (exclusion_violation) is the clean single-statement rejection;
 * `40P01` (deadlock_detected) shows up instead when two transactions race
 * for the same car/date-range and end up mutually blocked on the GiST
 * index — Postgres picks a victim and aborts it, which is functionally the
 * same outcome ("someone else got this slot first") even though it isn't
 * the constraint-violation error directly. Verified live by firing two
 * concurrent overlapping create requests. Prisma has no first-class concept
 * of exclusion constraints, so neither comes back as one of its own P-codes. */
const CONTENTION_SQLSTATES = new Set(["23P01", "40P01"]);

function isBookingContentionError(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; originalCode?: string } } | undefined)?.cause;
  if (cause?.code && CONTENTION_SQLSTATES.has(cause.code)) {
    return true;
  }
  if (cause?.originalCode && CONTENTION_SQLSTATES.has(cause.originalCode)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("deadlock detected") || message.includes("no_overlapping_bookings");
}

@Injectable()
export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBookingRecordInput): Promise<BookingEntity> {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            bookingNumber: input.bookingNumber,
            customerId: input.customerId,
            carId: input.carId,
            pickupLocationId: input.pickupLocationId,
            dropoffLocationId: input.dropoffLocationId,
            startDate: input.startDate,
            endDate: input.endDate,
            dailyRate: input.dailyRate,
            totalAmount: input.totalAmount,
            depositAmount: input.depositAmount,
          },
        });

        await tx.availabilityBlock.create({
          data: {
            carId: input.carId,
            startDate: input.startDate,
            endDate: input.endDate,
            reason: "BOOKED",
            bookingId: booking.id,
          },
        });

        return booking;
      });
    } catch (error) {
      if (isBookingContentionError(error)) {
        throw new BookingOverlapError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<BookingEntity | null> {
    return this.prisma.client.booking.findUnique({ where: { id } });
  }

  async findMany(filters: BookingListFilters): Promise<BookingListResult> {
    const where: Prisma.BookingWhereInput = {
      customerId: filters.customerId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.client.booking.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async updateStatus(id: string, status: Prisma.BookingUpdateInput["status"]): Promise<BookingEntity> {
    return this.prisma.client.booking.update({ where: { id }, data: { status } });
  }

  async cancel(id: string, reason: string): Promise<BookingEntity> {
    return this.prisma.client.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason },
      });
      await tx.availabilityBlock.deleteMany({ where: { bookingId: id } });
      return booking;
    });
  }
}
