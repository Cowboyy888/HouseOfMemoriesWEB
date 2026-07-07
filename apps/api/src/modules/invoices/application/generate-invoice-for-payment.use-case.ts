import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { INVOICE_REPOSITORY, type InvoiceRepository } from "../domain/invoice.repository";

export interface GenerateInvoiceInput {
  customerId: string;
  amount: number;
  bookingId: string | null;
  saleTransactionId: string | null;
  description: string;
}

function generateInvoiceNumber(): string {
  return `INV-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Called from Payments' HandlePaymentSuccessUseCase for every payment that
 * succeeds — this is a receipt for a completed transaction, not a bill sent
 * ahead of payment. Deliberately generated already `PAID`: this system
 * collects money directly through the Payments API (which already validates
 * the exact amount owed via `amountDue`), not by emailing an invoice and
 * waiting for it to be settled — so `DRAFT`/`ISSUED`/`VOID` exist on the
 * enum for a pre-payment invoicing lifecycle this module doesn't use yet
 * (e.g. a staff-issued invoice for an ad-hoc fee). No tax modeling exists
 * in the schema, so `taxAmount` is always 0 — not guessed.
 */
@Injectable()
export class GenerateInvoiceForPaymentUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}

  async execute(input: GenerateInvoiceInput): Promise<void> {
    const now = new Date();
    await this.invoices.create({
      invoiceNumber: generateInvoiceNumber(),
      customerId: input.customerId,
      bookingId: input.bookingId,
      saleTransactionId: input.saleTransactionId,
      issueDate: now,
      dueDate: now,
      subtotal: input.amount,
      taxAmount: 0,
      totalAmount: input.amount,
      status: "PAID",
      lineItems: [
        {
          description: input.description,
          quantity: 1,
          unitPrice: input.amount,
          lineTotal: input.amount,
        },
      ],
    });
  }
}
