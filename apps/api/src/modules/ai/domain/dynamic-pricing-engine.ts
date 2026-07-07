export interface DynamicPricingInput {
  carId: string;
  startDate: Date;
  endDate: Date;
  customerId: string | null;
}

export interface DynamicPricingContext {
  carId: string;
  baseDailyRate: number;
  demandLevel: "LOW" | "NORMAL" | "HIGH";
  loyaltyTier: "STANDARD" | "GOLD" | "PLATINUM";
  isCorporate: boolean;
  promotionActive: boolean;
}

export interface PricingBreakdownEntry {
  label: string;
  amount: number;
}

export interface DynamicPricingQuote {
  carId: string;
  baseDailyRate: number;
  recommendedDailyRate: number;
  breakdown: PricingBreakdownEntry[];
}

function isWeekend(date: Date): boolean {
  return [0, 6].includes(date.getUTCDay());
}

function computeDays(input: DynamicPricingInput): number {
  const ms = input.endDate.getTime() - input.startDate.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function calculateDynamicPrice(input: DynamicPricingInput, context: DynamicPricingContext): DynamicPricingQuote {
  const days = computeDays(input);
  const breakdown: PricingBreakdownEntry[] = [];
  let rate = context.baseDailyRate;

  const weekendPremium = isWeekend(input.startDate) || isWeekend(input.endDate) ? 10 : 0;
  if (weekendPremium > 0) {
    rate += weekendPremium;
    breakdown.push({ label: "Weekend premium", amount: weekendPremium });
  }

  if (days >= 2) {
    rate -= 8;
    breakdown.push({ label: "Longer stay discount", amount: -8 });
  }

  if (context.demandLevel === "HIGH") {
    rate += 15;
    breakdown.push({ label: "Demand surge premium", amount: 15 });
  } else if (context.demandLevel === "LOW") {
    rate -= 5;
    breakdown.push({ label: "Low demand adjustment", amount: -5 });
  }

  if (context.loyaltyTier === "GOLD") {
    rate -= 6;
    breakdown.push({ label: "Loyalty discount", amount: -6 });
  } else if (context.loyaltyTier === "PLATINUM") {
    rate -= 10;
    breakdown.push({ label: "Loyalty discount", amount: -10 });
  }

  if (context.promotionActive) {
    rate -= 7;
    breakdown.push({ label: "Promotional discount", amount: -7 });
  }

  if (context.isCorporate) {
    rate -= 5;
    breakdown.push({ label: "Corporate pricing", amount: -5 });
  }

  return {
    carId: context.carId,
    baseDailyRate: context.baseDailyRate,
    recommendedDailyRate: Math.round(rate),
    breakdown,
  };
}
