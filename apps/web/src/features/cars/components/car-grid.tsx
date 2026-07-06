"use client";

import type { CarListQuery } from "@drivehub/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCarsQuery } from "../hooks";
import { CarCard } from "./car-card";

export function CarGrid({ query }: { query: Partial<CarListQuery> }) {
  const { data, isLoading, isError } = useCarsQuery(query);

  if (isError) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Something went wrong loading cars. Please try again.
      </p>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[16/10] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="rounded-md border p-8 text-center text-muted-foreground">
        No cars match these filters. Try widening your search.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Showing {data.items.length} of {data.total} cars &middot; page {data.page}
      </p>
    </div>
  );
}
