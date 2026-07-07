import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { InstallmentScheduleRepository } from "../domain/installment-schedule.repository";

@Injectable()
export class PrismaInstallmentScheduleRepository implements InstallmentScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(scheduleId: string, amount: number): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      const schedule = await tx.paymentSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
      const amountPaid = schedule.amountPaid.toNumber() + amount;
      const isPaid = amountPaid >= schedule.amountDue.toNumber();

      await tx.paymentSchedule.update({
        where: { id: scheduleId },
        data: {
          amountPaid,
          ...(isPaid ? { status: "PAID", paidAt: new Date() } : {}),
        },
      });

      if (isPaid) {
        const remaining = await tx.paymentSchedule.count({
          where: { installmentPlanId: schedule.installmentPlanId, status: { not: "PAID" } },
        });
        if (remaining === 0) {
          await tx.installmentPlan.update({
            where: { id: schedule.installmentPlanId },
            data: { status: "COMPLETED" },
          });
        }
      }
    });
  }
}
