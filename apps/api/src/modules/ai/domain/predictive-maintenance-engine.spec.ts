import { describe, expect, it } from "vitest";
import { assessMaintenanceRisk, type MaintenanceRecord } from "./predictive-maintenance-engine";

function makeRecord(overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord {
  return {
    id: "maintenance-1",
    vehicleId: "car-1",
    mileage: 12000,
    ageMonths: 14,
    rentalFrequency: 4,
    lastServiceAt: new Date("2025-10-01T00:00:00.000Z"),
    inspectionScore: 85,
    ...overrides,
  };
}

describe("assessMaintenanceRisk", () => {
  it("flags vehicles with high mileage and frequent rentals", () => {
    const result = assessMaintenanceRisk(makeRecord({ mileage: 25000, rentalFrequency: 8 }));

    expect(result.level).toBe("HIGH");
    expect(result.reasons).toContain("High mileage");
    expect(result.reasons).toContain("Frequent rentals");
  });

  it("keeps healthy vehicles at a low risk", () => {
    const result = assessMaintenanceRisk(makeRecord({ mileage: 7000, rentalFrequency: 2, inspectionScore: 95, ageMonths: 6 }));

    expect(result.level).toBe("LOW");
    expect(result.reasons).toContain("Inspection healthy");
  });
});
