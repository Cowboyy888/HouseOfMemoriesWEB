"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchExecutiveSummary } from "./api";

export function useExecutiveSummaryQuery() {
  return useQuery({
    queryKey: ["dashboard", "executive-summary"],
    queryFn: fetchExecutiveSummary,
    retry: (failureCount, error) => {
      // Don't retry on auth/permission failures — retrying won't change the outcome.
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
