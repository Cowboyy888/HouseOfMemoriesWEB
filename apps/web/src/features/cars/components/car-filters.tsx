"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CarListQuery, ListingType } from "@drivehub/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LISTING_TYPE_OPTIONS: Array<{ value: ListingType | "ANY"; label: string }> = [
  { value: "ANY", label: "Rent or buy" },
  { value: "RENTAL", label: "Rent only" },
  { value: "SALE", label: "Buy only" },
  { value: "BOTH", label: "Available for both" },
];

export function CarFilters({ initialQuery }: { initialQuery: Partial<CarListQuery> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listingType, setListingType] = useState(initialQuery.listingType ?? "ANY");
  const [minPrice, setMinPrice] = useState(initialQuery.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(initialQuery.maxPrice?.toString() ?? "");

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (listingType === "ANY") {
      params.delete("listingType");
    } else {
      params.set("listingType", listingType);
    }
    if (minPrice) {
      params.set("minPrice", minPrice);
    } else {
      params.delete("minPrice");
    }
    if (maxPrice) {
      params.set("maxPrice", maxPrice);
    } else {
      params.delete("maxPrice");
    }
    params.delete("page");

    router.push(`/cars?${params.toString()}`);
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Listing type</label>
        <Select value={listingType} onValueChange={(value) => setListingType(value as typeof listingType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LISTING_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Min daily rate</label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="$0"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Max daily rate</label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="No limit"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />
      </div>

      <Button type="submit">Apply filters</Button>
    </form>
  );
}
