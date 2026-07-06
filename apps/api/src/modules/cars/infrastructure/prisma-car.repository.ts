import { Injectable } from "@nestjs/common";
import type { Prisma } from "@drivehub/database";
import { PrismaService } from "../../../shared/database/prisma.service";
import {
  carDetailInclude,
  carSummaryInclude,
  type CarDetailEntity,
  type CarListFilters,
  type CarListResult,
  type CarRepository,
} from "../domain/car.repository";

@Injectable()
export class PrismaCarRepository implements CarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: CarListFilters): Promise<CarListResult> {
    // A car listed as BOTH is rentable and purchasable, so a RENTAL/SALE
    // search must include it too — only an explicit BOTH search means
    // "only cars offered both ways" and stays an exact match.
    const listingTypeFilter: Prisma.CarWhereInput["listingType"] =
      filters.listingType === "RENTAL" || filters.listingType === "SALE"
        ? { in: [filters.listingType, "BOTH"] }
        : filters.listingType;

    const where: Prisma.CarWhereInput = {
      deletedAt: null,
      ...(filters.listingType ? { listingType: listingTypeFilter } : {}),
      ...(filters.brandSlug ? { brand: { slug: filters.brandSlug } } : {}),
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
      ...(filters.locationCode ? { currentLocation: { code: filters.locationCode } } : {}),
      ...(filters.minPrice != null || filters.maxPrice != null
        ? {
            dailyRentalRate: {
              ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.car.findMany({
        where,
        include: carSummaryInclude,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.client.car.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async findById(id: string): Promise<CarDetailEntity | null> {
    return this.prisma.client.car.findFirst({
      where: { id, deletedAt: null },
      include: carDetailInclude,
    });
  }
}
