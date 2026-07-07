import { Inject, Injectable } from "@nestjs/common";
import type { InvoiceListQuery, InvoiceListResult } from "@drivehub/contracts";
import { INVOICE_REPOSITORY, type InvoiceRepository } from "../domain/invoice.repository";
import { toInvoiceResult } from "./invoice.mapper";

@Injectable()
export class ListMyInvoicesUseCase {
  constructor(@Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}

  async execute(customerId: string, query: InvoiceListQuery): Promise<InvoiceListResult> {
    const result = await this.invoices.findMany({ customerId, page: query.page, pageSize: query.pageSize });
    return {
      items: result.items.map(toInvoiceResult),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
