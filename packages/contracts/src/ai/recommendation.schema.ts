import { z } from "zod";

export const RecommendationQuerySchema = z.object({
  budget: z.coerce.number().positive().optional(),
  passengerCount: z.coerce.number().int().positive().optional(),
  categorySlug: z.string().optional(),
  fuelType: z.enum(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "PLUG_IN_HYBRID"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
export type RecommendationQuery = z.infer<typeof RecommendationQuerySchema>;

export const RecommendedCarSchema = z.object({
  carId: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  dailyRentalRate: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
});
export type RecommendedCar = z.infer<typeof RecommendedCarSchema>;

export const RecommendationResultSchema = z.object({
  items: z.array(RecommendedCarSchema),
});
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;
