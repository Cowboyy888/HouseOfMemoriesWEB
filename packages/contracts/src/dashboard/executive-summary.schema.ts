import { z } from "zod";

// Monetary fields are strings — Prisma serializes Decimal to string over
// JSON, same convention as CarSummarySchema in the cars contract.
export const RevenueTrendPointSchema = z.object({
  month: z.string(), // "2026-07"
  revenue: z.string(),
});

export const CarsByStatusPointSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export const ExecutiveSummarySchema = z.object({
  totalRevenue: z.string(),
  monthlyRevenue: z.string(),
  monthlyProfit: z.string(),
  activeRentals: z.number(),
  availableCars: z.number(),
  carsUnderMaintenance: z.number(),
  carsSold: z.number(),
  pendingBookings: z.number(),
  activeCustomers: z.number(),
  employeeAttendanceToday: z.object({
    present: z.number(),
    total: z.number(),
  }),
  revenueTrend: z.array(RevenueTrendPointSchema),
  carsByStatus: z.array(CarsByStatusPointSchema),
});
export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;
