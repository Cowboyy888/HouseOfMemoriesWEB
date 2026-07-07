import { Injectable } from "@nestjs/common";
import { Prisma } from "@drivehub/database";
import { PrismaService } from "../../../shared/database/prisma.service";
import {
  paymentInclude,
  type CreatePaymentRecordInput,
  type PaymentEntity,
  type PaymentRepository,
  type UpdatePaymentProviderResultInput,
} from "../domain/payment.repository";

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePaymentRecordInput): Promise<PaymentEntity> {
    return this.prisma.client.payment.create({
      data: {
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        provider: input.provider,
        paidByCustomerId: input.paidByCustomerId,
        ...(input.payableType === "BOOKING" ? { bookingId: input.payableId } : {}),
        ...(input.payableType === "SALE" ? { saleTransactionId: input.payableId } : {}),
        ...(input.payableType === "PAYMENT_SCHEDULE" ? { paymentScheduleId: input.payableId } : {}),
      },
      include: paymentInclude,
    });
  }

  async findById(id: string): Promise<PaymentEntity | null> {
    return this.prisma.client.payment.findUnique({ where: { id }, include: paymentInclude });
  }

  async findByProviderPaymentId(providerPaymentId: string): Promise<PaymentEntity | null> {
    return this.prisma.client.payment.findUnique({ where: { providerPaymentId }, include: paymentInclude });
  }

  async updateProviderResult(id: string, input: UpdatePaymentProviderResultInput): Promise<PaymentEntity> {
    return this.prisma.client.payment.update({
      where: { id },
      data: {
        providerPaymentId: input.providerPaymentId,
        providerMetadata: input.providerMetadata === null ? Prisma.JsonNull : input.providerMetadata,
        status: input.status,
      },
      include: paymentInclude,
    });
  }

  async updateStatus(id: string, status: Prisma.PaymentUpdateInput["status"]): Promise<PaymentEntity> {
    return this.prisma.client.payment.update({ where: { id }, data: { status }, include: paymentInclude });
  }
}
