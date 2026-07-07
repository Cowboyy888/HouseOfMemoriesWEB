export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  mileage: number;
  ageMonths: number;
  rentalFrequency: number;
  lastServiceAt: Date;
  inspectionScore: number;
}

export interface MaintenanceAssessment {
  vehicleId: string;
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  reasons: string[];
}

export function assessMaintenanceRisk(record: MaintenanceRecord): MaintenanceAssessment {
  const reasons: string[] = [];
  let score = 0;

  if (record.mileage > 18000) {
    score += 35;
    reasons.push("High mileage");
  }

  if (record.rentalFrequency >= 6) {
    score += 25;
    reasons.push("Frequent rentals");
  }

  if (record.ageMonths > 24) {
    score += 20;
    reasons.push("Older vehicle");
  }

  if (record.inspectionScore < 80) {
    score += 20;
    reasons.push("Inspection needs attention");
  } else {
    reasons.push("Inspection healthy");
  }

  if (record.mileage > 30000 || record.rentalFrequency >= 8) {
    score += 10;
    reasons.push("Service window approaching");
  }

  let level: MaintenanceAssessment["level"] = "LOW";
  if (score >= 60) {
    level = "HIGH";
  } else if (score >= 30) {
    level = "MEDIUM";
  }

  return { vehicleId: record.vehicleId, level, score, reasons };
}
