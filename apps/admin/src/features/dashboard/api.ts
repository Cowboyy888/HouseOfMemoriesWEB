import { ExecutiveSummarySchema, type ExecutiveSummary } from "@drivehub/contracts";
import { apiFetch } from "@/lib/api-client";

export async function fetchExecutiveSummary(): Promise<ExecutiveSummary> {
  const data = await apiFetch<unknown>("/dashboard/executive-summary");
  return ExecutiveSummarySchema.parse(data);
}
