import type { Prisma } from "@drivehub/database";
import type { PayableType } from "@drivehub/contracts";

export const paymentInclude = { refunds: true } satisfies Prisma.PaymentInclude;
export type PaymentEntity = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

export interface CreatePaymentRecordInput {
  amount: number;
  currency: string;
  method: Prisma.PaymentCreateInput["method"];
  provider: Prisma.PaymentCreateInput["provider"];
  payableType: PayableType;
  payableId: string;
  paidByCustomerId: string;
}

export interface UpdatePaymentProviderResultInput {
  providerPaymentId: string | null;
  providerMetadata: Record<string, string> | null;
  status: Prisma.PaymentUpdateInput["status"];
}

export const PAYMENT_REPOSITORY = Symbol("PAYMENT_REPOSITORY");

export interface PaymentRepository {
  create(input: CreatePaymentRecordInput): Promise<PaymentEntity>;
  findById(id: string): Promise<PaymentEntity | null>;
  findByProviderPaymentId(providerPaymentId: string): Promise<PaymentEntity | null>;
  updateProviderResult(id: string, input: UpdatePaymentProviderResultInput): Promise<PaymentEntity>;
  updateStatus(id: string, status: Prisma.PaymentUpdateInput["status"]): Promise<PaymentEntity>;
}
