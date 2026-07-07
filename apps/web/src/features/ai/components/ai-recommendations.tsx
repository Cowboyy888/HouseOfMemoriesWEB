"use client";

import { CarFront, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";

type RecommendationItem = {
  carId: string;
  brand: string;
  model: string;
  year: number;
  dailyRentalRate: string;
  score: number;
  reasons: string[];
};

export function AiRecommendations() {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      try {
        const response = await fetch(`${env.apiUrl}/ai/recommendations?limit=3`, {
          credentials: "include",
        });

        const payload = await response.json().catch(() => undefined);

        if (!response.ok) {
          throw new Error((payload as { message?: string } | undefined)?.message ?? "Recommendations are unavailable right now.");
        }

        if (active) {
          setItems(((payload as { items?: RecommendationItem[] } | undefined)?.items ?? []) as RecommendationItem[]);
          setError(null);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Recommendations are unavailable right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-8 w-full rounded-3xl border bg-background/80 p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CarFront className="size-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <p className="text-sm text-muted-foreground">A few vehicles the system would surface based on your current browsing context.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading recommendations…
        </div>
      ) : error ? (
        <p className="mt-5 text-sm text-muted-foreground">{error}</p>
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
