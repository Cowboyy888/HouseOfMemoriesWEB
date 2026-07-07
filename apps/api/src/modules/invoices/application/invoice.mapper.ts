import type { InvoiceResult } from "@drivehub/contracts";
import type { InvoiceEntity } from "../domain/invoice.repository";

export function toInvoiceResult(invoice: InvoiceEntity): InvoiceResult {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    subtotal: invoice.subtotal.toString(),
    taxAmount: invoice.taxAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    pdfUrl: invoice.pdfUrl,
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
    createdAt: invoice.createdAt.toISOString(),
  };
}
