import { describe, expect, it, vi } from "vitest";
import type { InvoiceRepository } from "../domain/invoice.repository";
import { GenerateInvoiceForPaymentUseCase, type GenerateInvoiceInput } from "./generate-invoice-for-payment.use-case";

const input: GenerateInvoiceInput = {
  customerId: "customer-1",
  amount: 325,
  bookingId: "booking-1",
  saleTransactionId: null,
  description: "Booking BK-0001 payment",
};

describe("GenerateInvoiceForPaymentUseCase", () => {
  it("generates an invoice number matching the INV-XXXXXXXX format", async () => {
    const create = vi.fn().mockResolvedValue({});
    const useCase = new GenerateInvoiceForPaymentUseCase({ create } as unknown as InvoiceRepository);

    await useCase.execute(input);

    const created = create.mock.calls[0][0];
    expect(created.invoiceNumber).toMatch(/^INV-[0-9A-F]{8}$/);
  });

  it("always creates the invoice already PAID with zero tax — this is a receipt for a payment already collected, not a pre-payment bill (ADR-016)", async () => {
    const create = vi.fn().mockResolvedValue({});
    const useCase = new GenerateInvoiceForPaymentUseCase({ create } as unknown as InvoiceRepository);

    await useCase.execute(input);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PAID", taxAmount: 0, subtotal: 325, totalAmount: 325 }),
    );
  });

  it("mirrors the payment amount into a single line item", async () => {
    const create = vi.fn().mockResolvedValue({});
    const useCase = new GenerateInvoiceForPaymentUseCase({ create } as unknown as InvoiceRepository);

    await useCase.execute(input);

    const created = create.mock.calls[0][0];
    expect(created.lineItems).toEqual([
      { description: input.description, quantity: 1, unitPrice: 325, lineTotal: 325 },
    ]);
  });

  it("issues the invoice with issueDate and dueDate both set to now (never a future due date)", async () => {
    const create = vi.fn().mockResolvedValue({});
    const useCase = new GenerateInvoiceForPaymentUseCase({ create } as unknown as InvoiceRepository);

    await useCase.execute(input);

    const created = create.mock.calls[0][0];
    expect(created.issueDate).toEqual(created.dueDate);
  });

  it("passes through bookingId/saleTransactionId as given, without inventing a value for whichever one is null", async () => {
    const create = vi.fn().mockResolvedValue({});
    const useCase = new GenerateInvoiceForPaymentUseCase({ create } as unknown as InvoiceRepository);

    await useCase.execute({ ...input, bookingId: null, saleTransactionId: "sale-1" });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: null, saleTransactionId: "sale-1" }),
    );
  });
});
