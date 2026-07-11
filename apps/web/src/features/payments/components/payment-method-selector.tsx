"use client";

import { useState } from "react";
import type { PaymentResult } from "@drivehub/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useCreatePaymentMutation } from "../hooks";

interface PaymentMethodSelectorProps {
  payableType: "BOOKING" | "SALE" | "PAYMENT_SCHEDULE";
  payableId: string;
  amount: number;
  currency: "USD" | "KHR";
  onPaid: (payment: PaymentResult) => void;
}

// Stripe and ABA PayWay are wired up server-side but inert without real
// credentials in this environment — offering them here would only ever
// dead-end in a 503 for a real user, so only the two fully-functional
// providers are exposed (see Payments.md for the inert-credential pattern).
const OPTIONS = [
  { provider: "MANUAL" as const, method: "BANK_TRANSFER" as const, label: "Bank Transfer" },
  { provider: "KHQR" as const, method: "QR_CODE" as const, label: "KHQR (Cambodia)" },
];

export function PaymentMethodSelector({ payableType, payableId, amount, currency, onPaid }: PaymentMethodSelectorProps) {
  const [error, setError] = useState<string | null>(null);
  const createPayment = useCreatePaymentMutation();

  async function pay(option: (typeof OPTIONS)[number]) {
    setError(null);
    try {
      const payment = await createPayment.mutateAsync({
        amount,
        currency,
        method: option.method,
        provider: option.provider,
        payableType,
        payableId,
        idempotencyKey: crypto.randomUUID(),
      });
      onPaid(payment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Amount due: <span className="font-semibold text-foreground tabular-nums">{formatCurrency(amount.toFixed(2))}</span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <Button
              key={option.provider}
              variant="outline"
              disabled={createPayment.isPending}
              onClick={() => pay(option)}
            >
              {createPayment.isPending ? "Starting…" : option.label}
            </Button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
