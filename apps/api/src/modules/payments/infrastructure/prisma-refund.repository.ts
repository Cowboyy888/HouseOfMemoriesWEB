import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { CreateRefundRecordInput, RefundEntity, RefundRepository } from "../domain/refund.repository";

@Injectable()
export class PrismaRefundRepository implements RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRefundRecordInput): Promise<RefundEntity> {
    return this.prisma.client.refund.create({
      data: {
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason,
        status: input.status,
        providerRefundId: input.providerRefundId,
      },
    });
  }

  async sumProcessed(paymentId: string): Promise<number> {
    const result = await this.prisma.client.refund.aggregate({
      where: { paymentId, status: "PROCESSED" },
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }
}
