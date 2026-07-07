"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { useBookingQuery, useCancelBookingMutation } from "@/features/bookings/hooks";
import { useCarQuery } from "@/features/cars/hooks";
import { PaymentMethodSelector } from "@/features/payments/components/payment-method-selector";
import { PaymentPanel } from "@/features/payments/components/payment-panel";
import { usePaymentQuery } from "@/features/payments/hooks";
import { useSession } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/format";

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  const { isPending: sessionPending, data: session } = useSession();
  const booking = useBookingQuery(id);
  const car = useCarQuery(booking.data?.carId ?? "");
  const payment = usePaymentQuery(paymentId);
  const cancelBooking = useCancelBookingMutation(id);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  if (sessionPending || booking.isLoading) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Loading…</main>;
  }
  if (!session) {
    router.replace(`/sign-in?redirect=/account/bookings/${id}`);
    return null;
  }
  if (booking.isError || !booking.data) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-destructive">Couldn&apos;t load this booking.</main>;
  }

  const b = booking.data;
  const canCancel = b.status === "PENDING" || b.status === "CONFIRMED";
  const needsPayment = b.status === "PENDING";

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    await cancelBooking.mutateAsync({ reason: cancelReason });
    setShowCancelForm(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to account
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{b.bookingNumber}</h1>
        <BookingStatusBadge status={b.status} />
      </div>

      {car.data && (
        <p className="mt-1 text-muted-foreground">
          {car.data.brand.name} {car.data.model} ({car.data.year})
        </p>
      )}

      <Card className="mt-6">
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Pickup</p>
            <p className="font-medium">{new Date(b.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Return</p>
            <p className="font-medium">{new Date(b.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Daily rate</p>
            <p className="font-medium tabular-nums">{formatCurrency(b.dailyRate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Total</p>
            <p className="font-medium tabular-nums">{formatCurrency(b.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {b.status === "CANCELLED" && b.cancellationReason && (
        <p className="mt-4 text-sm text-muted-foreground">Cancelled: {b.cancellationReason}</p>
      )}

      {needsPayment && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Deposit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay the deposit to confirm this booking. It&apos;s confirmed automatically once the payment succeeds.
          </p>
          <div className="mt-3">
            {payment.data ? (
              <PaymentPanel payment={payment.data} />
            ) : (
              <PaymentMethodSelector
                payableType="BOOKING"
                payableId={b.id}
                amount={Number(b.depositAmount)}
                currency={b.currency === "KHR" ? "KHR" : "USD"}
                onPaid={(created) => router.replace(`/account/bookings/${id}?paymentId=${created.id}`)}
              />
            )}
          </div>
        </div>
      )}

      {canCancel && (
        <div className="mt-8 border-t pt-6">
          {showCancelForm ? (
            <div className="space-y-2">
              <label htmlFor="cancel-reason" className="text-sm font-medium">
                Why are you cancelling?
              </label>
              <textarea
                id="cancel-reason"
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={!cancelReason.trim() || cancelBooking.isPending}
                  onClick={handleCancel}
                >
                  {cancelBooking.isPending ? "Cancelling…" : "Confirm cancellation"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCancelForm(false)}>
                  Never mind
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setShowCancelForm(true)}>
              Cancel booking
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
