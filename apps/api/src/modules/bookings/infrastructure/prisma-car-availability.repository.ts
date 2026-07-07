import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { CarAvailabilityRepository, RentableCar } from "../domain/car-availability.repository";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE"] as const;

@Injectable()
export class PrismaCarAvailabilityRepository implements CarAvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRentableCar(carId: string): Promise<RentableCar | null> {
    const car = await this.prisma.client.car.findFirst({
      where: { id: carId, deletedAt: null, listingType: { in: ["RENTAL", "BOTH"] } },
      select: { id: true, categoryId: true, dailyRentalRate: true },
    });
    if (!car || car.dailyRentalRate == null) {
      return null;
    }
    return { id: car.id, categoryId: car.categoryId, dailyRentalRate: car.dailyRentalRate.toNumber() };
  }

  async hasOverlap(carId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<boolean> {
    const [overlappingBooking, overlappingBlock] = await Promise.all([
      this.prisma.client.booking.findFirst({
        where: {
          carId,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      }),
      // Maintenance/admin holds aren't tied to a Booking row's status, so
      // they're checked independently — BOOKED-reason blocks are covered
      // above via the Booking query itself, not duplicated here.
      this.prisma.client.availabilityBlock.findFirst({
        where: {
          carId,
          reason: { in: ["MAINTENANCE", "ADMIN_HOLD"] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      }),
    ]);

    return overlappingBooking != null || overlappingBlock != null;
  }
}
