import { Injectable } from "@nestjs/common";
import type { PayableType } from "@drivehub/contracts";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { PayableResolver, ResolvedPayable } from "../domain/payable-resolver";

@Injectable()
export class PrismaPayableResolver implements PayableResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(payableType: PayableType, payableId: string): Promise<ResolvedPayable | null> {
    if (payableType === "BOOKING") {
      const booking = await this.prisma.client.booking.findUnique({
        where: { id: payableId },
        select: {
          customerId: true,
          depositAmount: true,
          payments: { where: { status: "SUCCEEDED" }, select: { amount: true } },
        },
      });
      if (!booking) {
        return null;
      }
      const paid = booking.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      return { ownerCustomerId: booking.customerId, amountDue: Math.max(0, booking.depositAmount.toNumber() - paid) };
    }

    if (payableType === "SALE") {
      const sale = await this.prisma.client.saleTransaction.findUnique({
        where: { id: payableId },
        select: {
          customerId: true,
          salePrice: true,
          payments: { where: { status: "SUCCEEDED" }, select: { amount: true } },
        },
      });
      if (!sale) {
        return null;
      }
      const paid = sale.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      return { ownerCustomerId: sale.customerId, amountDue: Math.max(0, sale.salePrice.toNumber() - paid) };
    }

    const schedule = await this.prisma.client.paymentSchedule.findUnique({
      where: { id: payableId },
      select: {
        amountDue: true,
        amountPaid: true,
        installmentPlan: { select: { saleTransaction: { select: { customerId: true } } } },
      },
    });
    if (!schedule) {
      return null;
    }
    return {
      ownerCustomerId: schedule.installmentPlan.saleTransaction.customerId,
      amountDue: Math.max(0, schedule.amountDue.toNumber() - schedule.amountPaid.toNumber()),
    };
  }
}
