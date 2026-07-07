import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { AiContextRepository, CarCatalogSummary, CustomerBookingSummary } from "../domain/ai-context.repository";

@Injectable()
export class PrismaAiContextRepository implements AiContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableCarsSummary(limit: number): Promise<CarCatalogSummary[]> {
    const cars = await this.prisma.client.car.findMany({
      where: { deletedAt: null, status: "AVAILABLE" },
      include: { brand: true, category: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return cars.map((car) => ({
      brand: car.brand.name,
      model: car.model,
      year: car.year,
      category: car.category.name,
      listingType: car.listingType,
      dailyRentalRate: car.dailyRentalRate ? car.dailyRentalRate.toNumber() : null,
      salePrice: car.salePrice ? car.salePrice.toNumber() : null,
    }));
  }

  async findRecentBookingsForCustomer(customerId: string, limit: number): Promise<CustomerBookingSummary[]> {
    const bookings = await this.prisma.client.booking.findMany({
      where: { customerId },
      include: { car: { include: { brand: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return bookings.map((booking) => ({
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      carLabel: `${booking.car.brand.name} ${booking.car.model}`,
    }));
  }
}
