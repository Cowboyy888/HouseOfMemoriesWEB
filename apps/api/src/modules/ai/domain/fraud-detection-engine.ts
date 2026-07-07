export interface FraudDetectionInput {
  bookingAmount: number;
  sameCardUsedAcrossBookings: boolean;
  recentBookingCount: number;
  identityMismatch: boolean;
  priorDisputes: number;
  highRiskCountry: boolean;
}

export interface FraudDetectionResult {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  flags: string[];
  recommendation: string;
}

export function analyzeFraudSignals(input: FraudDetectionInput): FraudDetectionResult {
  let score = 0;
  const flags: string[] = [];

  if (input.bookingAmount > 500) {
    score += 20;
  }

  if (input.sameCardUsedAcrossBookings) {
    score += 20;
    flags.push("Multiple recent bookings with the same payment instrument");
  }

  if (input.recentBookingCount >= 3) {
    score += 15;
    flags.push("Unusual booking velocity detected");
  }

  if (input.identityMismatch) {
    score += 25;
    flags.push("Identity mismatch detected");
  }

  if (input.priorDisputes > 0) {
    score += 15 + input.priorDisputes * 5;
    flags.push("Previous dispute history present");
  }

  if (input.highRiskCountry) {
    score += 15;
    flags.push("High-risk geography detected");
  }

  let riskLevel: FraudDetectionResult["riskLevel"] = "LOW";
  if (score >= 70) {
    riskLevel = "HIGH";
  } else if (score >= 35) {
    riskLevel = "MEDIUM";
  }

  const recommendation = riskLevel === "HIGH"
    ? "Escalate review and require manual verification"
    : riskLevel === "MEDIUM"
      ? "Request additional verification before confirming"
      : "Proceed with standard verification";

  return {
    score: Math.min(score, 100),
    riskLevel,
    flags,
    recommendation,
  };
}
