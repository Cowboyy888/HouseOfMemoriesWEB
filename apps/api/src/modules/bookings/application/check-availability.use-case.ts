import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AvailabilityResult, CheckAvailabilityQuery } from "@drivehub/contracts";
import { CAR_AVAILABILITY_REPOSITORY, type CarAvailabilityRepository } from "../domain/car-availability.repository";
import { PRICING_RULE_REPOSITORY, type PricingRuleRepository } from "../domain/pricing-rule.repository";
import { computeNightCount, resolveDailyRate } from "../domain/pricing-rule-resolver";

@Injectable()
export class CheckAvailabilityUseCase {
  constructor(
    @Inject(CAR_AVAILABILITY_REPOSITORY) private readonly carAvailability: CarAvailabilityRepository,
    @Inject(PRICING_RULE_REPOSITORY) private readonly pricingRules: PricingRuleRepository,
  ) {}

  async execute(query: CheckAvailabilityQuery): Promise<AvailabilityResult> {
    const car = await this.carAvailability.findRentableCar(query.carId);
    if (!car) {
      throw new NotFoundException(`Car ${query.carId} is not available for rental`);
    }
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const hasOverlap = await this.carAvailability.hasOverlap(query.carId, startDate, endDate);
    if (hasOverlap) {
      return { available: false, estimatedDailyRate: null, estimatedTotalAmount: null };
    }

    const days = computeNightCount(startDate, endDate);
    const applicableRules = await this.pricingRules.findApplicable(car.id, car.categoryId, startDate, endDate, days);
    const dailyRate = resolveDailyRate(car.dailyRentalRate, applicableRules, startDate, days);
    const totalAmount = Math.round(dailyRate * days * 100) / 100;

    return { available: true, estimatedDailyRate: dailyRate.toFixed(2), estimatedTotalAmount: totalAmount.toFixed(2) };
  }
}
