"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useMyInvoicesQuery } from "../hooks";

export function MyInvoicesList() {
  const { data, isLoading, isError } = useMyInvoicesQuery({ pageSize: 10 });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your invoices…</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">Couldn&apos;t load your invoices. Try refreshing the page.</p>;
  }
  if (!data || data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet — one is created automatically after each payment.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.items.map((invoice) => (
        <li key={invoice.id}>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <ul className="mt-3 space-y-1 border-t pt-3">
                {invoice.lineItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{item.description}</span>
                    <span className="tabular-nums">{formatCurrency(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
