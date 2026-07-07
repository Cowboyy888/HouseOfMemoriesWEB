import { z } from "zod";

export const BookingStatusSchema = z.enum(["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export type BookingStatusType = z.infer<typeof BookingStatusSchema>;

export const CreateBookingRequestSchema = z
  .object({
    carId: z.string().uuid(),
    pickupLocationId: z.string().uuid(),
    dropoffLocationId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "startDate must be before endDate",
    path: ["endDate"],
  });
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;

export const CancelBookingRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type CancelBookingRequest = z.infer<typeof CancelBookingRequestSchema>;

export const CheckAvailabilityQuerySchema = z
  .object({
    carId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "startDate must be before endDate",
    path: ["endDate"],
  });
export type CheckAvailabilityQuery = z.infer<typeof CheckAvailabilityQuerySchema>;

export const AvailabilityResultSchema = z.object({
  available: z.boolean(),
  // Present only when available — a rule-adjusted price preview so the
  // customer sees the actual rate before creating the booking, not just a
  // yes/no. Same resolution CreateBookingUseCase uses, so this never
  // disagrees with the price the booking is actually created at.
  estimatedDailyRate: z.string().nullable(),
  estimatedTotalAmount: z.string().nullable(),
});
export type AvailabilityResult = z.infer<typeof AvailabilityResultSchema>;

export const BookingListQuerySchema = z.object({
  status: BookingStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type BookingListQuery = z.infer<typeof BookingListQuerySchema>;

export const BookingResultSchema = z.object({
  id: z.string(),
  bookingNumber: z.string(),
  status: BookingStatusSchema,
  carId: z.string(),
  pickupLocationId: z.string(),
  dropoffLocationId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dailyRate: z.string(),
  totalAmount: z.string(),
  depositAmount: z.string(),
  currency: z.string(),
  cancelledAt: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.string(),
});
export type BookingResult = z.infer<typeof BookingResultSchema>;

export const BookingListResultSchema = z.object({
  items: z.array(BookingResultSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type BookingListResult = z.infer<typeof BookingListResultSchema>;
