import { describe, expect, it } from "vitest";
import { buildExecutiveInsights, type ExecutiveInsightInput } from "./business-intelligence-engine";

function makeInput(overrides: Partial<ExecutiveInsightInput> = {}): ExecutiveInsightInput {
  return {
    totalRevenue: 150000,
    monthlyRevenue: 40000,
    activeRentals: 24,
    activeCustomers: 180,
    conversionRate: 0.18,
    occupancyRate: 0.72,
    topVehicle: "Toyota Camry",
    ...overrides,
  };
}

describe("buildExecutiveInsights", () => {
  it("returns a balanced summary for healthy business performance", () => {
    const insights = buildExecutiveInsights(makeInput());

    expect(insights.summary).toContain("healthy");
    expect(insights.recommendations.length).toBeGreaterThan(0);
  });

  it("flags underperformance when conversion is low", () => {
    const insights = buildExecutiveInsights(makeInput({ conversionRate: 0.06, occupancyRate: 0.45 }));

    expect(insights.summary).toContain("underperforming");
    expect(insights.recommendations).toContain("Increase booking conversion with targeted offers");
  });
});
