export interface ExecutiveSummaryData {
  totalRevenue: string;
  monthlyRevenue: string;
  monthlyProfit: string;
  activeRentals: number;
  availableCars: number;
  carsUnderMaintenance: number;
  carsSold: number;
  pendingBookings: number;
  activeCustomers: number;
  employeeAttendanceToday: { present: number; total: number };
  revenueTrend: Array<{ month: string; revenue: string }>;
  carsByStatus: Array<{ status: string; count: number }>;
}

export const DASHBOARD_REPOSITORY = Symbol("DASHBOARD_REPOSITORY");

export interface DashboardRepository {
  getExecutiveSummary(): Promise<ExecutiveSummaryData>;
}
