import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { DashboardRepository, ExecutiveSummaryData } from "../domain/dashboard.repository";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const REVENUE_TREND_MONTHS = 6;

@Injectable()
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveSummary(): Promise<ExecutiveSummaryData> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const nextMonthStart = addMonths(monthStart, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [
      totalRevenueAgg,
      monthlyRevenueAgg,
      monthlyMaintenanceCostAgg,
      monthlyPayrollAgg,
      activeRentals,
      availableCars,
      carsUnderMaintenance,
      carsSold,
      pendingBookings,
      activeCustomers,
      attendancePresentToday,
      activeEmployeeCount,
      carsByStatusRaw,
      revenueTrend,
    ] = await Promise.all([
      this.prisma.client.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      this.prisma.client.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt: { gte: monthStart, lt: nextMonthStart } },
        _sum: { amount: true },
      }),
      this.prisma.client.maintenanceRecord.aggregate({
        where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
        _sum: { cost: true },
      }),
      this.prisma.client.payroll.aggregate({
        where: { payPeriodEnd: { gte: monthStart, lt: nextMonthStart } },
        _sum: { netPay: true },
      }),
      this.prisma.client.booking.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.car.count({ where: { status: "AVAILABLE", deletedAt: null } }),
      this.prisma.client.car.count({ where: { status: "MAINTENANCE", deletedAt: null } }),
      this.prisma.client.car.count({ where: { status: "SOLD", deletedAt: null } }),
      this.prisma.client.booking.count({ where: { status: "PENDING" } }),
      this.prisma.client.customerProfile.count({ where: { deletedAt: null } }),
      this.prisma.client.attendance.count({
        where: { date: { gte: today, lt: tomorrow }, status: "PRESENT" },
      }),
      this.prisma.client.employee.count({ where: { deletedAt: null, employmentStatus: "ACTIVE" } }),
      this.prisma.client.car.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.getRevenueTrend(monthStart),
    ]);

    const monthlyRevenue = Number(monthlyRevenueAgg._sum.amount ?? 0);
    const monthlyMaintenanceCost = Number(monthlyMaintenanceCostAgg._sum.cost ?? 0);
    const monthlyPayroll = Number(monthlyPayrollAgg._sum.netPay ?? 0);
    const monthlyProfit = monthlyRevenue - monthlyMaintenanceCost - monthlyPayroll;

    return {
      totalRevenue: (totalRevenueAgg._sum.amount ?? 0).toString(),
      monthlyRevenue: monthlyRevenue.toString(),
      monthlyProfit: monthlyProfit.toString(),
      activeRentals,
      availableCars,
      carsUnderMaintenance,
      carsSold,
      pendingBookings,
      activeCustomers,
      employeeAttendanceToday: { present: attendancePresentToday, total: activeEmployeeCount },
      revenueTrend,
      carsByStatus: carsByStatusRaw.map((row) => ({ status: row.status, count: row._count._all })),
    };
  }

  private async getRevenueTrend(currentMonthStart: Date): Promise<Array<{ month: string; revenue: string }>> {
    const months = Array.from({ length: REVENUE_TREND_MONTHS }, (_, index) =>
      addMonths(currentMonthStart, index - (REVENUE_TREND_MONTHS - 1)),
    );

    const sums = await Promise.all(
      months.map((monthDate) =>
        this.prisma.client.payment.aggregate({
          where: {
            status: "SUCCEEDED",
            createdAt: { gte: monthDate, lt: addMonths(monthDate, 1) },
          },
          _sum: { amount: true },
        }),
      ),
    );

    return months.map((monthDate, index) => ({
      month: monthLabel(monthDate),
      revenue: (sums[index]._sum.amount ?? 0).toString(),
    }));
  }
}
