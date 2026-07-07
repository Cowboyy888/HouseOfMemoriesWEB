"use client";

import { QRCodeSVG } from "qrcode.react";
import type { PaymentResult } from "@drivehub/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVerifyPaymentMutation } from "../hooks";
import { PaymentStatusBadge } from "./payment-status-badge";

export function PaymentPanel({ payment }: { payment: PaymentResult }) {
  const verify = useVerifyPaymentMutation(payment.id);
  const canRefresh = payment.status === "PENDING";

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Payment</p>
          <PaymentStatusBadge status={payment.status} />
        </div>

        {payment.providerMetadata?.qr && (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-4">
            <QRCodeSVG value={payment.providerMetadata.qr} size={200} />
            <p className="text-center text-sm text-muted-foreground">
              Scan with a KHQR-enabled banking app to pay.
            </p>
          </div>
        )}

        {payment.providerMetadata?.bankInstructions && (
          <p className="rounded-lg bg-muted/50 p-3 text-sm">{payment.providerMetadata.bankInstructions}</p>
        )}

        {payment.providerMetadata?.checkoutUrl && (
          <Button asChild className="w-full">
            <a href={payment.providerMetadata.checkoutUrl} target="_blank" rel="noreferrer">
              Continue to checkout
            </a>
          </Button>
        )}

        {canRefresh && (
          <Button variant="outline" className="w-full" onClick={() => verify.mutate()} disabled={verify.isPending}>
            {verify.isPending ? "Checking…" : "Refresh status"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
