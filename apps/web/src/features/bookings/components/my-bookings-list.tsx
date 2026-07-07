"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useMyBookingsQuery } from "../hooks";
import { BookingStatusBadge } from "./booking-status-badge";

export function MyBookingsList() {
  const { data, isLoading, isError } = useMyBookingsQuery({ pageSize: 10 });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your bookings…</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">Couldn&apos;t load your bookings. Try refreshing the page.</p>;
  }
  if (!data || data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven&apos;t booked a car yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.items.map((booking) => (
        <li key={booking.id}>
          <Link href={`/account/bookings/${booking.id}`}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{booking.bookingNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.startDate).toLocaleDateString()} &ndash; {new Date(booking.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(booking.totalAmount)}</span>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
