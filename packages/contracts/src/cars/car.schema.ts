import { z } from "zod";

export const ListingTypeSchema = z.enum(["RENTAL", "SALE", "BOTH"]);
export type ListingType = z.infer<typeof ListingTypeSchema>;

// Query params arrive as strings over HTTP — z.coerce turns "2" into 2, etc.
export const CarListQuerySchema = z.object({
  brandSlug: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  listingType: ListingTypeSchema.optional(),
  locationCode: z.string().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type CarListQuery = z.infer<typeof CarListQuerySchema>;

const BrandSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
});

const CarCategorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const LocationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  city: z.string(),
  state: z.string(),
});

const CarImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: z.string().nullable(),
  isPrimary: z.boolean(),
  position: z.number(),
});

// Prisma serializes Decimal fields to strings over JSON — kept as strings
// here rather than numbers so the contract matches the real wire format;
// the frontend formats them for display at render time.
export const CarSummarySchema = z.object({
  id: z.string(),
  vin: z.string(),
  model: z.string(),
  year: z.number(),
  color: z.string(),
  condition: z.string(),
  listingType: ListingTypeSchema,
  status: z.string(),
  dailyRentalRate: z.string().nullable(),
  salePrice: z.string().nullable(),
  brand: BrandSummarySchema,
  category: CarCategorySummarySchema,
  currentLocation: LocationSummarySchema.nullable(),
  images: z.array(CarImageSchema),
});
export type CarSummary = z.infer<typeof CarSummarySchema>;

export const CarListResponseSchema = z.object({
  items: z.array(CarSummarySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type CarListResponse = z.infer<typeof CarListResponseSchema>;

const CarFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
});

const CarReviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

export const CarDetailSchema = CarSummarySchema.extend({
  trim: z.string().nullable(),
  mileage: z.number(),
  fuelType: z.string(),
  transmission: z.string(),
  seatingCapacity: z.number(),
  features: z.array(CarFeatureSchema),
  reviews: z.array(CarReviewSchema),
});
export type CarDetail = z.infer<typeof CarDetailSchema>;
