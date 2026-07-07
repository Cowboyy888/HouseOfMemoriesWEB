import type { Invoice, Prisma } from "@drivehub/database";

export const invoiceInclude = { lineItems: true } satisfies Prisma.InvoiceInclude;
export type InvoiceEntity = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export interface CreateInvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreateInvoiceRecordInput {
  invoiceNumber: string;
  customerId: string;
  bookingId: string | null;
  saleTransactionId: string | null;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: Invoice["status"];
  lineItems: CreateInvoiceLineItemInput[];
}

export interface InvoiceListFilters {
  customerId: string;
  page: number;
  pageSize: number;
}

export interface InvoiceListResult {
  items: InvoiceEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export const INVOICE_REPOSITORY = Symbol("INVOICE_REPOSITORY");

export interface InvoiceRepository {
  create(input: CreateInvoiceRecordInput): Promise<InvoiceEntity>;
  findById(id: string): Promise<InvoiceEntity | null>;
  findMany(filters: InvoiceListFilters): Promise<InvoiceListResult>;
}
