"use client";

import { useQuery } from "@tanstack/react-query";
import type { CarListQuery } from "@drivehub/contracts";
import { fetchCarById, fetchCars } from "./api";

export function useCarsQuery(query: Partial<CarListQuery>) {
  return useQuery({
    queryKey: ["cars", query],
    queryFn: () => fetchCars(query),
  });
}

export function useCarQuery(id: string) {
  return useQuery({
    queryKey: ["car", id],
    queryFn: () => fetchCarById(id),
  });
}
