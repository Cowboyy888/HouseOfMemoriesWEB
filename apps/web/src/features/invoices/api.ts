import { InvoiceListResultSchema, type InvoiceListQuery, type InvoiceListResult } from "@drivehub/contracts";
import { authedFetch } from "@/lib/api-client";

function buildQueryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMyInvoices(query: Partial<InvoiceListQuery> = {}): Promise<InvoiceListResult> {
  return authedFetch(`/invoices/mine${buildQueryString(query)}`, undefined, (json) => InvoiceListResultSchema.parse(json));
}
