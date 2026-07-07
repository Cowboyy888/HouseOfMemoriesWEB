import { Injectable } from "@nestjs/common";
import type { Prisma } from "@drivehub/database";
import { PrismaService } from "../../../shared/database/prisma.service";
import {
  invoiceInclude,
  type CreateInvoiceRecordInput,
  type InvoiceEntity,
  type InvoiceListFilters,
  type InvoiceListResult,
  type InvoiceRepository,
} from "../domain/invoice.repository";

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvoiceRecordInput): Promise<InvoiceEntity> {
    return this.prisma.client.invoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        customerId: input.customerId,
        bookingId: input.bookingId,
        saleTransactionId: input.saleTransactionId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        totalAmount: input.totalAmount,
        status: input.status,
        lineItems: {
          create: input.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: invoiceInclude,
    });
  }

  async findById(id: string): Promise<InvoiceEntity | null> {
    return this.prisma.client.invoice.findUnique({ where: { id }, include: invoiceInclude });
  }

  async findMany(filters: InvoiceListFilters): Promise<InvoiceListResult> {
    const where: Prisma.InvoiceWhereInput = { customerId: filters.customerId };

    const [items, total] = await Promise.all([
      this.prisma.client.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.client.invoice.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }
}
