import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { CandidateCar, CustomerAffinity } from "../domain/recommendation-engine";
import type { RecommendationContextRepository } from "../domain/recommendation-context.repository";

@Injectable()
export class PrismaRecommendationContextRepository implements RecommendationContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidateCars(): Promise<CandidateCar[]> {
    const cars = await this.prisma.client.car.findMany({
      where: { deletedAt: null, status: "AVAILABLE", listingType: { in: ["RENTAL", "BOTH"] }, dailyRentalRate: { not: null } },
      include: { brand: true, category: true },
    });

    return cars
      .filter((car) => car.dailyRentalRate != null)
      .map((car) => ({
        id: car.id,
        brand: car.brand.name,
        model: car.model,
        year: car.year,
        categorySlug: car.category.slug,
        fuelType: car.fuelType,
        seatingCapacity: car.seatingCapacity,
        dailyRentalRate: car.dailyRentalRate!.toNumber(),
      }));
  }

  async findCustomerAffinity(customerId: string): Promise<CustomerAffinity> {
    const bookings = await this.prisma.client.booking.findMany({
      where: { customerId },
      include: { car: { include: { brand: true, category: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return {
      brandNames: [...new Set(bookings.map((b) => b.car.brand.name))],
      categorySlugs: [...new Set(bookings.map((b) => b.car.category.slug))],
    };
  }
}
