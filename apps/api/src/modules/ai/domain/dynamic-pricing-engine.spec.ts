import { describe, expect, it } from "vitest";
import { calculateDynamicPrice, type DynamicPricingContext, type DynamicPricingInput } from "./dynamic-pricing-engine";

function makeInput(overrides: Partial<DynamicPricingInput> = {}): DynamicPricingInput {
  return {
    carId: "car-1",
    startDate: new Date("2026-07-10T10:00:00.000Z"),
    endDate: new Date("2026-07-12T10:00:00.000Z"),
    customerId: null,
    ...overrides,
  };
}

function makeContext(overrides: Partial<DynamicPricingContext> = {}): DynamicPricingContext {
  return {
    carId: "car-1",
    baseDailyRate: 80,
    demandLevel: "NORMAL",
    loyaltyTier: "STANDARD",
    isCorporate: false,
    promotionActive: false,
    ...overrides,
  };
}

describe("calculateDynamicPrice", () => {
  it("adds a weekend premium and a long-stay discount", () => {
    const quote = calculateDynamicPrice(makeInput(), makeContext());

    expect(quote.baseDailyRate).toBe(80);
    expect(quote.recommendedDailyRate).toBeGreaterThan(80);
    expect(quote.breakdown.some((entry) => entry.label === "Weekend premium")).toBe(true);
    expect(quote.breakdown.some((entry) => entry.label === "Longer stay discount")).toBe(true);
  });

  it("applies loyalty and promotion discounts", () => {
    const quote = calculateDynamicPrice(makeInput(), makeContext({ loyaltyTier: "GOLD", promotionActive: true }));

    expect(quote.recommendedDailyRate).toBeLessThan(80);
    expect(quote.breakdown.some((entry) => entry.label === "Loyalty discount")).toBe(true);
    expect(quote.breakdown.some((entry) => entry.label === "Promotional discount")).toBe(true);
  });

  it("raises prices under high demand", () => {
    const quote = calculateDynamicPrice(makeInput(), makeContext({ demandLevel: "HIGH" }));

    expect(quote.recommendedDailyRate).toBeGreaterThan(80);
    expect(quote.breakdown.some((entry) => entry.label === "Demand surge premium")).toBe(true);
  });
});
