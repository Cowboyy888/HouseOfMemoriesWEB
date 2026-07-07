"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/format";
import { useAvailabilityQuery, useCreateBookingMutation } from "../hooks";

interface BookingWidgetProps {
  carId: string;
  locationId: string;
}

function toIsoStartOfDay(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00.000Z`).toISOString();
}

export function BookingWidget({ carId, locationId }: BookingWidgetProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const query = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (new Date(startDate) >= new Date(endDate)) return null;
    return { carId, startDate: toIsoStartOfDay(startDate), endDate: toIsoStartOfDay(endDate) };
  }, [carId, startDate, endDate]);

  const availability = useAvailabilityQuery(query);
  const createBooking = useCreateBookingMutation();

  const datesInvalid = startDate !== "" && endDate !== "" && new Date(startDate) >= new Date(endDate);
  const today = new Date().toISOString().slice(0, 10);

  async function handleBookNow() {
    setFormError(null);
    if (!query) {
      setFormError("Choose valid pickup and return dates first.");
      return;
    }
    if (!session) {
      router.push(`/sign-in?redirect=/cars/${carId}`);
      return;
    }
    try {
      const booking = await createBooking.mutateAsync({
        carId,
        pickupLocationId: locationId,
        dropoffLocationId: locationId,
        startDate: query.startDate,
        endDate: query.endDate,
      });
      router.push(`/account/bookings/${booking.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create the booking.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pickup-date" className="text-xs font-medium text-muted-foreground">
            Pickup
          </label>
          <Input
            id="pickup-date"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="return-date" className="text-xs font-medium text-muted-foreground">
            Return
          </label>
          <Input
            id="return-date"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {datesInvalid && <p className="text-sm text-destructive">Return date must be after the pickup date.</p>}

      {query && availability.isLoading && <p className="text-sm text-muted-foreground">Checking availability…</p>}

      {query && availability.data && !availability.data.available && (
        <p className="text-sm text-destructive">This car isn&apos;t available for the selected dates.</p>
      )}

      {query && availability.data?.available && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium tabular-nums">{formatCurrency(availability.data.estimatedDailyRate)} / day</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="font-semibold tabular-nums">{formatCurrency(availability.data.estimatedTotalAmount)}</span>
          </div>
        </div>
      )}

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button
        className="w-full"
        size="lg"
        disabled={!query || availability.data?.available === false || createBooking.isPending || sessionPending}
        onClick={handleBookNow}
      >
        {createBooking.isPending ? "Booking…" : session ? "Book Now" : "Sign in to Book"}
      </Button>
    </div>
  );
}
