import type { Refund } from "@drivehub/database";

export type RefundEntity = Refund;

export interface CreateRefundRecordInput {
  paymentId: string;
  amount: number;
  reason: string;
  status: Refund["status"];
  providerRefundId: string | null;
}

export const REFUND_REPOSITORY = Symbol("REFUND_REPOSITORY");

export interface RefundRepository {
  create(input: CreateRefundRecordInput): Promise<RefundEntity>;
  sumProcessed(paymentId: string): Promise<number>;
}
