import type { Metadata } from "next";
import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard-view";

export const metadata: Metadata = {
  title: "Executive Dashboard",
};

export default function ExecutiveDashboardPage() {
  return <ExecutiveDashboardView />;
}
