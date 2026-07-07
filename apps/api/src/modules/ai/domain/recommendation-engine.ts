export interface RecommendationCriteria {
  budget: number | null;
  passengerCount: number | null;
  categorySlug: string | null;
  fuelType: string | null;
}

export interface CustomerAffinity {
  brandNames: string[];
  categorySlugs: string[];
}

export interface CandidateCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  categorySlug: string;
  fuelType: string;
  seatingCapacity: number;
  dailyRentalRate: number;
}

export interface ScoredCar extends CandidateCar {
  score: number;
  reasons: string[];
}

const WEIGHTS = { budget: 35, passengers: 25, category: 20, fuel: 10, affinity: 10 };

/**
 * Deterministic, explainable scoring — not an LLM call. Sprint 7's own
 * brief says pricing decisions "must be explainable and logged"; the same
 * principle applies here even though it isn't stated for this module
 * specifically. A numeric score with a reasons[] breakdown can be audited
 * and unit-tested exactly; an LLM asked to "score this car 0-100" cannot,
 * and would be slower and less consistent for no real benefit.
 *
 * A car that doesn't fit the party (insufficient seats) is disqualified
 * outright (score 0) rather than merely penalized — recommending a car
 * that can't actually seat the group isn't a "lower-scoring" option, it's
 * not an option.
 */
export function scoreCar(car: CandidateCar, criteria: RecommendationCriteria, affinity: CustomerAffinity): ScoredCar {
  const reasons: string[] = [];
  let score = 0;

  if (criteria.passengerCount != null && car.seatingCapacity < criteria.passengerCount) {
    return { ...car, score: 0, reasons: [`Only seats ${car.seatingCapacity}, need ${criteria.passengerCount}`] };
  }
  if (criteria.passengerCount != null) {
    const excessSeats = car.seatingCapacity - criteria.passengerCount;
    const fitScore = excessSeats === 0 ? 1 : Math.max(0, 1 - excessSeats * 0.15);
    score += WEIGHTS.passengers * fitScore;
    if (fitScore > 0.85) reasons.push(`Comfortably seats your group of ${criteria.passengerCount}`);
  } else {
    score += WEIGHTS.passengers * 0.5;
  }

  if (criteria.budget != null) {
    if (car.dailyRentalRate <= criteria.budget) {
      const utilization = car.dailyRentalRate / criteria.budget;
      score += WEIGHTS.budget * (0.6 + 0.4 * utilization);
      reasons.push(`Fits your budget of $${criteria.budget.toFixed(2)}/day`);
    } else {
      const overBy = (car.dailyRentalRate - criteria.budget) / criteria.budget;
      score += WEIGHTS.budget * Math.max(0, 0.3 - overBy);
    }
  } else {
    score += WEIGHTS.budget * 0.5;
  }

  if (criteria.categorySlug != null) {
    if (car.categorySlug === criteria.categorySlug) {
      score += WEIGHTS.category;
      reasons.push(`Matches your preferred ${criteria.categorySlug} category`);
    }
  } else {
    score += WEIGHTS.category * 0.5;
  }

  if (criteria.fuelType != null) {
    if (car.fuelType === criteria.fuelType) {
      score += WEIGHTS.fuel;
      reasons.push(`Runs on your preferred ${criteria.fuelType.toLowerCase()} fuel`);
    }
  } else {
    score += WEIGHTS.fuel * 0.5;
  }

  if (affinity.brandNames.includes(car.brand)) {
    score += WEIGHTS.affinity;
    reasons.push(`You've rented from ${car.brand} before`);
  } else if (affinity.categorySlugs.includes(car.categorySlug)) {
    score += WEIGHTS.affinity * 0.5;
    reasons.push(`Similar to cars you've booked before`);
  }

  return { ...car, score: Math.round(score), reasons };
}

export function rankCars(cars: CandidateCar[], criteria: RecommendationCriteria, affinity: CustomerAffinity): ScoredCar[] {
  return cars
    .map((car) => scoreCar(car, criteria, affinity))
    .sort((a, b) => b.score - a.score);
}
