import type { Prisma } from "@drivehub/database";

export const carDetailInclude = {
  brand: true,
  category: true,
  images: { orderBy: { position: "asc" } },
  currentLocation: true,
  featureAssignments: { include: { feature: true } },
  reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 10 },
} satisfies Prisma.CarInclude;

export const carSummaryInclude = {
  brand: true,
  category: true,
  images: { orderBy: { position: "asc" } },
  currentLocation: true,
} satisfies Prisma.CarInclude;

export type CarSummaryEntity = Prisma.CarGetPayload<{ include: typeof carSummaryInclude }>;
export type CarDetailEntity = Prisma.CarGetPayload<{ include: typeof carDetailInclude }>;

export interface CarListFilters {
  brandSlug?: string;
  categorySlug?: string;
  listingType?: "RENTAL" | "SALE" | "BOTH";
  locationCode?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  pageSize: number;
}

export interface CarListResult {
  items: CarSummaryEntity[];
  total: number;
  page: number;
  pageSize: number;
}

/** DI token for the port — kept as a symbol so the application layer never
 * depends on the Prisma-backed implementation directly (Repository Pattern). */
export const CAR_REPOSITORY = Symbol("CAR_REPOSITORY");

export interface CarRepository {
  findMany(filters: CarListFilters): Promise<CarListResult>;
  findById(id: string): Promise<CarDetailEntity | null>;
}
