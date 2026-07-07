import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { InvoiceResult } from "@drivehub/contracts";
import { INVOICE_REPOSITORY, type InvoiceRepository } from "../domain/invoice.repository";
import { toInvoiceResult } from "./invoice.mapper";

@Injectable()
export class GetInvoiceUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}

  async execute(invoiceId: string, requestingCustomerId: string): Promise<InvoiceResult> {
    const invoice = await this.invoices.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} was not found`);
    }
    if (invoice.customerId !== requestingCustomerId) {
      throw new ForbiddenException("You can only view your own invoices");
    }
    return toInvoiceResult(invoice);
  }
}
