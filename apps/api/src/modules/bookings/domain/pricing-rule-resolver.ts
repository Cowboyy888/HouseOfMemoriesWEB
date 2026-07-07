import type { ApplicablePricingRule } from "./pricing-rule.repository";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Shared by CreateBookingUseCase and CheckAvailabilityUseCase so both
 * compute the same night count the same way — a price preview that
 * disagreed with the price actually charged at booking time would be
 * worse than not previewing it at all. */
export function computeNightCount(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
}

/** Weekend nights (Friday, Saturday) get the WEEKEND rule's multiplier on
 * top of everything else — the industry-standard "weekend rate" nights for
 * car rental. There's no per-night rate storage on Booking, so this
 * resolver returns one blended effective daily rate for the whole stay
 * (nights-weighted average) rather than per-night pricing — a considered
 * simplification, documented here rather than silently assumed exact. */
function countWeekendNights(startDate: Date, days: number): number {
  let weekendNights = 0;
  for (let i = 0; i < days; i++) {
    const night = new Date(startDate.getTime() + i * MS_PER_DAY);
    const dayOfWeek = night.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      weekendNights++;
    }
  }
  return weekendNights;
}

/** Picks the highest-priority rule of a given type, preferring car-specific
 * rules over category-level ones of the same type entirely (not just as a
 * priority tiebreaker) — a car-specific rule is an override, not merely a
 * higher-priority default. */
function pickBest(rules: ApplicablePricingRule[], ruleType: ApplicablePricingRule["ruleType"]): ApplicablePricingRule | null {
  const candidates = rules.filter((r) => r.ruleType === ruleType);
  if (candidates.length === 0) {
    return null;
  }
  const carSpecific = candidates.filter((r) => r.isCarSpecific);
  const pool = carSpecific.length > 0 ? carSpecific : candidates;
  return pool.reduce((best, rule) => (rule.priority > best.priority ? rule : best));
}

/**
 * Resolves the effective daily rate for a booking from the car's base rate
 * plus whichever PricingRule rows apply — replaces the flat
 * `car.dailyRentalRate` this used to be, per Sprint 6's Booking Rules
 * module. BASE overrides the rate entirely (flatRate); SEASONAL,
 * PROMOTIONAL, and LONG_TERM_DISCOUNT compound as multipliers; WEEKEND
 * additionally compounds only on the nights that fall on Friday/Saturday.
 */
export function resolveDailyRate(
  baseDailyRate: number,
  applicableRules: ApplicablePricingRule[],
  startDate: Date,
  days: number,
): number {
  const baseRule = pickBest(applicableRules, "BASE");
  const rate = baseRule?.flatRate ?? baseDailyRate;

  const seasonalRule = pickBest(applicableRules, "SEASONAL");
  const promoRule = pickBest(applicableRules, "PROMOTIONAL");
  const longTermRule = pickBest(applicableRules, "LONG_TERM_DISCOUNT");
  const weekendRule = pickBest(applicableRules, "WEEKEND");

  const weekdayMultiplier = (seasonalRule?.multiplier ?? 1) * (promoRule?.multiplier ?? 1) * (longTermRule?.multiplier ?? 1);
  const weekendMultiplier = weekdayMultiplier * (weekendRule?.multiplier ?? 1);

  const weekendNights = countWeekendNights(startDate, days);
  const weekdayNights = days - weekendNights;

  const blended = (weekdayNights * rate * weekdayMultiplier + weekendNights * rate * weekendMultiplier) / days;
  return Math.round(blended * 100) / 100;
}
