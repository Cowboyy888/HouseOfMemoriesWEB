import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@drivehub/database";
import { PrismaDashboardRepository } from "./prisma-dashboard.repository";
import type { PrismaService } from "../../../shared/database/prisma.service";

function decimalSum(value: number | null) {
  return { _sum: { amount: value == null ? null : new Prisma.Decimal(value) } };
}

interface Config {
  totalRevenue?: number | null;
  monthlyRevenue?: number | null;
  maintenanceCost?: number | null;
  payroll?: number | null;
  carsByStatus?: Array<{ status: string; count: number }>;
}

function makePrisma(config: Config = {}): PrismaService {
  // Promise.all evaluates array elements in source order, so the first
  // payment.aggregate call is always the all-time total and every call
  // after it (the current-month figure, then each revenue-trend month) is
  // the monthly figure.
  const paymentAggregate = vi
    .fn()
    .mockResolvedValueOnce(decimalSum(config.totalRevenue ?? null))
    .mockResolvedValue(decimalSum(config.monthlyRevenue ?? null));

  return {
    client: {
      payment: { aggregate: paymentAggregate },
      maintenanceRecord: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { cost: config.maintenanceCost == null ? null : new Prisma.Decimal(config.maintenanceCost) },
        }),
      },
      payroll: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { netPay: config.payroll == null ? null : new Prisma.Decimal(config.payroll) },
        }),
      },
      booking: { count: vi.fn().mockResolvedValue(0) },
      car: {
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue(
          (config.carsByStatus ?? []).map((row) => ({ status: row.status, _count: { _all: row.count } })),
        ),
      },
      customerProfile: { count: vi.fn().mockResolvedValue(0) },
      attendance: { count: vi.fn().mockResolvedValue(0) },
      employee: { count: vi.fn().mockResolvedValue(0) },
    },
  } as unknown as PrismaService;
}

describe("PrismaDashboardRepository.getExecutiveSummary", () => {
  it("computes monthlyProfit as monthlyRevenue minus maintenance cost minus payroll", async () => {
    const repository = new PrismaDashboardRepository(
      makePrisma({ monthlyRevenue: 10_000, maintenanceCost: 1500, payroll: 4000 }),
    );

    const summary = await repository.getExecutiveSummary();

    expect(summary.monthlyRevenue).toBe("10000");
    expect(summary.monthlyProfit).toBe("4500");
  });

  it("defaults revenue and profit figures to 0 when there is no data yet, instead of throwing on a null Decimal sum", async () => {
    const repository = new PrismaDashboardRepository(makePrisma({}));

    const summary = await repository.getExecutiveSummary();

    expect(summary.totalRevenue).toBe("0");
    expect(summary.monthlyRevenue).toBe("0");
    expect(summary.monthlyProfit).toBe("0");
  });

  it("keeps totalRevenue (all-time) independent from monthlyRevenue (current month only)", async () => {
    const repository = new PrismaDashboardRepository(makePrisma({ totalRevenue: 50_000, monthlyRevenue: 8_000 }));

    const summary = await repository.getExecutiveSummary();

    expect(summary.totalRevenue).toBe("50000");
    expect(summary.monthlyRevenue).toBe("8000");
  });

  it("maps car.groupBy rows into plain {status, count} pairs", async () => {
    const repository = new PrismaDashboardRepository(
      makePrisma({ carsByStatus: [{ status: "AVAILABLE", count: 12 }, { status: "MAINTENANCE", count: 3 }] }),
    );

    const summary = await repository.getExecutiveSummary();

    expect(summary.carsByStatus).toEqual([
      { status: "AVAILABLE", count: 12 },
      { status: "MAINTENANCE", count: 3 },
    ]);
  });

  it("builds exactly 6 trailing months of revenue trend, ending at the current month", async () => {
    const repository = new PrismaDashboardRepository(makePrisma({}));
    const now = new Date();

    const summary = await repository.getExecutiveSummary();

    expect(summary.revenueTrend).toHaveLength(6);
    const currentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(summary.revenueTrend.at(-1)?.month).toBe(currentLabel);
  });
});
