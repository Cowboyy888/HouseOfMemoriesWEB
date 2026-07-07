import { describe, expect, it } from "vitest";
import { analyzeFraudSignals, type FraudDetectionInput } from "./fraud-detection-engine";

function makeInput(overrides: Partial<FraudDetectionInput> = {}): FraudDetectionInput {
  return {
    bookingAmount: 180,
    sameCardUsedAcrossBookings: false,
    recentBookingCount: 1,
    identityMismatch: false,
    priorDisputes: 0,
    highRiskCountry: false,
    ...overrides,
  };
}

describe("analyzeFraudSignals", () => {
  it("flags high-risk behavior when several signals appear together", () => {
    const result = analyzeFraudSignals(makeInput({
      bookingAmount: 900,
      sameCardUsedAcrossBookings: true,
      recentBookingCount: 5,
      identityMismatch: true,
      priorDisputes: 2,
      highRiskCountry: true,
    }));

    expect(result.score).toBeGreaterThan(70);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.flags).toContain("Multiple recent bookings with the same payment instrument");
    expect(result.flags).toContain("Identity mismatch detected");
  });

  it("keeps low-risk bookings in the safe range", () => {
    const result = analyzeFraudSignals(makeInput());

    expect(result.score).toBeLessThan(40);
    expect(result.riskLevel).toBe("LOW");
    expect(result.flags).toEqual([]);
    expect(result.recommendation).toContain("Proceed");
  });
});
