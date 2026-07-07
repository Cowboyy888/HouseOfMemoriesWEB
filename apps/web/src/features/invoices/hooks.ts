"use client";

import { useQuery } from "@tanstack/react-query";
import type { InvoiceListQuery } from "@drivehub/contracts";
import { fetchMyInvoices } from "./api";

export function useMyInvoicesQuery(query: Partial<InvoiceListQuery> = {}) {
  return useQuery({
    queryKey: ["my-invoices", query],
    queryFn: () => fetchMyInvoices(query),
  });
}
