import { describe, expect, it } from "vitest";
import { rankCars, scoreCar, type CandidateCar } from "./recommendation-engine";

const noAffinity = { brandNames: [], categorySlugs: [] };
const noCriteria = { budget: null, passengerCount: null, categorySlug: null, fuelType: null };

function makeCar(overrides: Partial<CandidateCar> = {}): CandidateCar {
  return {
    id: "car-1",
    brand: "Toyota",
    model: "Camry",
    year: 2024,
    categorySlug: "sedan",
    fuelType: "GASOLINE",
    seatingCapacity: 5,
    dailyRentalRate: 65,
    ...overrides,
  };
}

describe("scoreCar", () => {
  it("disqualifies a car that can't seat the party, regardless of other fit", () => {
    const car = makeCar({ seatingCapacity: 4 });
    const result = scoreCar(car, { ...noCriteria, passengerCount: 5 }, noAffinity);

    expect(result.score).toBe(0);
    expect(result.reasons[0]).toMatch(/Only seats 4, need 5/);
  });

  it("scores a car within budget higher than one over budget", () => {
    const withinBudget = scoreCar(makeCar({ dailyRentalRate: 60 }), { ...noCriteria, budget: 70 }, noAffinity);
    const overBudget = scoreCar(makeCar({ dailyRentalRate: 90 }), { ...noCriteria, budget: 70 }, noAffinity);

    expect(withinBudget.score).toBeGreaterThan(overBudget.score);
    expect(withinBudget.reasons).toContain("Fits your budget of $70.00/day");
  });

  it("rewards an exact category match", () => {
    const matching = scoreCar(makeCar({ categorySlug: "suv" }), { ...noCriteria, categorySlug: "suv" }, noAffinity);
    const notMatching = scoreCar(makeCar({ categorySlug: "sedan" }), { ...noCriteria, categorySlug: "suv" }, noAffinity);

    expect(matching.score).toBeGreaterThan(notMatching.score);
  });

  it("gives a bigger boost for brand affinity than category affinity", () => {
    const brandMatch = scoreCar(makeCar({ brand: "Toyota", categorySlug: "sedan" }), noCriteria, {
      brandNames: ["Toyota"],
      categorySlugs: [],
    });
    const categoryOnlyMatch = scoreCar(makeCar({ brand: "Honda", categorySlug: "sedan" }), noCriteria, {
      brandNames: ["Toyota"],
      categorySlugs: ["sedan"],
    });
    const noMatch = scoreCar(makeCar({ brand: "Honda", categorySlug: "suv" }), noCriteria, {
      brandNames: ["Toyota"],
      categorySlugs: ["sedan"],
    });

    expect(brandMatch.score).toBeGreaterThan(categoryOnlyMatch.score);
    expect(categoryOnlyMatch.score).toBeGreaterThan(noMatch.score);
  });

  it("never disqualifies when no passenger count is given", () => {
    const result = scoreCar(makeCar({ seatingCapacity: 2 }), noCriteria, noAffinity);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("rankCars", () => {
  it("sorts by score descending and excludes nothing itself (filtering is the caller's job)", () => {
    const cars = [
      makeCar({ id: "low", dailyRentalRate: 150 }),
      makeCar({ id: "high", dailyRentalRate: 50 }),
    ];

    const ranked = rankCars(cars, { ...noCriteria, budget: 60 }, noAffinity);

    expect(ranked[0]?.id).toBe("high");
    expect(ranked[1]?.id).toBe("low");
  });
});
