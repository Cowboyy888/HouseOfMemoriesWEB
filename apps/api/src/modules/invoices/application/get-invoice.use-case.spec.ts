import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@drivehub/database";
import type { InvoiceEntity, InvoiceRepository } from "../domain/invoice.repository";
import { GetInvoiceUseCase } from "./get-invoice.use-case";

function makeInvoice(overrides: Partial<InvoiceEntity> = {}): InvoiceEntity {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-ABCD1234",
    customerId: "customer-1",
    bookingId: "booking-1",
    saleTransactionId: null,
    issueDate: new Date(),
    dueDate: new Date(),
    subtotal: new Prisma.Decimal(325),
    taxAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(325),
    status: "PAID",
    pdfUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [],
    ...overrides,
  } as InvoiceEntity;
}

describe("GetInvoiceUseCase", () => {
  it("throws NotFoundException when the invoice doesn't exist", async () => {
    const invoices = { findById: vi.fn().mockResolvedValue(null) } as unknown as InvoiceRepository;
    const useCase = new GetInvoiceUseCase(invoices);

    await expect(useCase.execute("invoice-1", "customer-1")).rejects.toThrow(/was not found/);
  });

  it("throws ForbiddenException when the invoice belongs to a different customer", async () => {
    const invoices = {
      findById: vi.fn().mockResolvedValue(makeInvoice({ customerId: "someone-else" })),
    } as unknown as InvoiceRepository;
    const useCase = new GetInvoiceUseCase(invoices);

    await expect(useCase.execute("invoice-1", "customer-1")).rejects.toThrow(/your own/);
  });

  it("returns the mapped invoice when it belongs to the requesting customer", async () => {
    const invoices = { findById: vi.fn().mockResolvedValue(makeInvoice()) } as unknown as InvoiceRepository;
    const useCase = new GetInvoiceUseCase(invoices);

    const result = await useCase.execute("invoice-1", "customer-1");

    expect(result.id).toBe("invoice-1");
    expect(result.totalAmount).toBe("325");
  });
});
