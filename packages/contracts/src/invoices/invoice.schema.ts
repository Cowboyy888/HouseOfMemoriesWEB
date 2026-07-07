import { z } from "zod";

export const InvoiceStatusSchema = z.enum(["DRAFT", "ISSUED", "PAID", "VOID"]);
export type InvoiceStatusType = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceLineItemResultSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  lineTotal: z.string(),
});
export type InvoiceLineItemResult = z.infer<typeof InvoiceLineItemResultSchema>;

export const InvoiceResultSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  status: InvoiceStatusSchema,
  issueDate: z.string(),
  dueDate: z.string(),
  subtotal: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  pdfUrl: z.string().nullable(),
  lineItems: z.array(InvoiceLineItemResultSchema),
  createdAt: z.string(),
});
export type InvoiceResult = z.infer<typeof InvoiceResultSchema>;

export const InvoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type InvoiceListQuery = z.infer<typeof InvoiceListQuerySchema>;

export const InvoiceListResultSchema = z.object({
  items: z.array(InvoiceResultSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type InvoiceListResult = z.infer<typeof InvoiceListResultSchema>;
