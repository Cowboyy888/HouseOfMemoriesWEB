import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { fetchCars } from "@/features/cars/api";
import { CarFilters } from "@/features/cars/components/car-filters";
import { CarGrid } from "@/features/cars/components/car-grid";
import { parseCarListSearchParams, type RawSearchParams } from "@/features/cars/search-params";

export const metadata: Metadata = {
  title: "Browse Cars | DriveHub",
  description: "Search and filter our fleet of rental and for-sale vehicles by type, brand, and price.",
  alternates: {
    canonical: "/cars",
  },
};

interface CarsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseCarListSearchParams(resolvedSearchParams);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["cars", query],
    queryFn: () => fetchCars(query),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Browse Cars</h1>
      <p className="mt-1 text-muted-foreground">Rent or buy from our available fleet.</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <CarFilters initialQuery={query} />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <CarGrid query={query} />
        </HydrationBoundary>
      </div>
    </main>
  );
}
