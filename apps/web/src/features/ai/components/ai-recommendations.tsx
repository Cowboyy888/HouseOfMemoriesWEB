"use client";

import { CarFront, Loader2 } from "lucide-react";
import { useRecommendationsQuery } from "@/features/ai/hooks";

export function AiRecommendations() {
  const { data, isLoading, error } = useRecommendationsQuery({ limit: 3 });
  const items = data?.items ?? [];

  return (
    <section className="mt-8 w-full rounded-3xl border bg-background/80 p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CarFront className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <p className="text-sm text-muted-foreground">A few vehicles the system would surface based on your current browsing context.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading recommendations…
        </div>
      ) : error ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Recommendations are unavailable right now."}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">No recommendations available just yet.</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.carId} className="rounded-2xl border bg-muted/20 p-4 text-left">
              <p className="font-semibold">{item.brand} {item.model}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.year}</p>
              <p className="mt-3 text-sm font-medium">${item.dailyRentalRate}/day</p>
              <p className="mt-2 text-xs text-muted-foreground">Score: {item.score}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {item.reasons.slice(0, 2).map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
