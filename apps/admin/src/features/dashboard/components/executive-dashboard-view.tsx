"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecutiveSummaryQuery } from "@/features/dashboard/hooks";
import { ApiError } from "@/lib/api-client";
import { CarsByStatusChart } from "./cars-by-status-chart";
import { KpiCard } from "./kpi-card";
import { RevenueTrendChart } from "./revenue-trend-chart";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ExecutiveDashboardView() {
  const { data, isLoading, error } = useExecutiveSummaryQuery();

  if (error) {
    const apiError = error as ApiError;
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="font-medium">{apiError.message ?? "Something went wrong"}</p>
        {apiError.status === 403 && (
          <p className="max-w-md text-sm text-muted-foreground">
            Your account doesn&apos;t have the <code className="font-mono">report:view</code> permission. Ask a
            Super Admin, Company Owner, Branch Manager, or Finance Manager to grant it.
          </p>
        )}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const attendanceRate =
    data.employeeAttendanceToday.total > 0
      ? Math.round((data.employeeAttendanceToday.present / data.employeeAttendanceToday.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">Company-wide performance at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Revenue"
          value={currencyFormatter.format(Number(data.totalRevenue))}
          icon={<BadgeDollarSign className="size-4" />}
        />
        <KpiCard
          label="Monthly Revenue"
          value={currencyFormatter.format(Number(data.monthlyRevenue))}
          icon={<TrendingUp className="size-4" />}
        />
        <KpiCard
          label="Monthly Profit"
          value={currencyFormatter.format(Number(data.monthlyProfit))}
          icon={<BadgeDollarSign className="size-4" />}
          tone={Number(data.monthlyProfit) >= 0 ? "good" : "critical"}
        />
        <KpiCard label="Active Rentals" value={String(data.activeRentals)} icon={<Car className="size-4" />} />
        <KpiCard
          label="Available Cars"
          value={String(data.availableCars)}
          icon={<CheckCircle2 className="size-4" />}
          tone="good"
        />
        <KpiCard
          label="Cars Under Maintenance"
          value={String(data.carsUnderMaintenance)}
          icon={<Wrench className="size-4" />}
          tone={data.carsUnderMaintenance > 0 ? "warning" : "neutral"}
        />
        <KpiCard label="Cars Sold" value={String(data.carsSold)} icon={<ClipboardList className="size-4" />} />
        <KpiCard
          label="Pending Bookings"
          value={String(data.pendingBookings)}
          icon={<CalendarClock className="size-4" />}
          tone={data.pendingBookings > 0 ? "warning" : "neutral"}
        />
        <KpiCard label="Active Customers" value={String(data.activeCustomers)} icon={<Users className="size-4" />} />
        <KpiCard
          label="Employee Attendance"
          value={`${data.employeeAttendanceToday.present}/${data.employeeAttendanceToday.total}`}
          hint={`${attendanceRate}% present today`}
          icon={<UserCheck className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueTrendChart data={data.revenueTrend} />
        <CarsByStatusChart data={data.carsByStatus} />
      </div>
    </div>
  );
}
