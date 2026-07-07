import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { ApplicablePricingRule, PricingRuleRepository } from "../domain/pricing-rule.repository";

@Injectable()
export class PrismaPricingRuleRepository implements PricingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findApplicable(
    carId: string,
    categoryId: string,
    startDate: Date,
    endDate: Date,
    days: number,
  ): Promise<ApplicablePricingRule[]> {
    const rules = await this.prisma.client.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [{ carId }, { carId: null, categoryId }],
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: endDate } }] },
          { OR: [{ validTo: null }, { validTo: { gte: startDate } }] },
          { OR: [{ minDays: null }, { minDays: { lte: days } }] },
        ],
      },
    });

    return rules.map((rule) => ({
      ruleType: rule.ruleType,
      isCarSpecific: rule.carId != null,
      multiplier: rule.multiplier ? rule.multiplier.toNumber() : null,
      flatRate: rule.flatRate ? rule.flatRate.toNumber() : null,
      priority: rule.priority,
    }));
  }
}
