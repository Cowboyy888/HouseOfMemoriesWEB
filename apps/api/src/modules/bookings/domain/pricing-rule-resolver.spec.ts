import { describe, expect, it } from "vitest";
import type { ApplicablePricingRule } from "./pricing-rule.repository";
import { computeNightCount, resolveDailyRate } from "./pricing-rule-resolver";

function rule(overrides: Partial<ApplicablePricingRule>): ApplicablePricingRule {
  return { ruleType: "SEASONAL", isCarSpecific: false, multiplier: null, flatRate: null, priority: 0, ...overrides };
}

describe("computeNightCount", () => {
  it("counts the nights between two dates", () => {
    expect(computeNightCount(new Date("2027-01-10T00:00:00.000Z"), new Date("2027-01-15T00:00:00.000Z"))).toBe(5);
  });

  it("floors to a minimum of 1 night", () => {
    expect(computeNightCount(new Date("2027-01-10T00:00:00.000Z"), new Date("2027-01-10T00:00:00.000Z"))).toBe(1);
  });
});

describe("resolveDailyRate", () => {
  const start = new Date("2027-01-10T00:00:00.000Z"); // Sunday — no weekend nights in a 5-night stay from here.

  it("returns the car's base rate when no rules apply", () => {
    expect(resolveDailyRate(65, [], start, 5)).toBe(65);
  });

  it("uses a BASE rule's flatRate in place of the base rate", () => {
    const rules = [rule({ ruleType: "BASE", flatRate: 80 })];
    expect(resolveDailyRate(65, rules, start, 5)).toBe(80);
  });

  it("prefers a car-specific BASE rule over a category-level one, even if the category rule has higher priority", () => {
    const rules = [
      rule({ ruleType: "BASE", isCarSpecific: false, flatRate: 80, priority: 100 }),
      rule({ ruleType: "BASE", isCarSpecific: true, flatRate: 90, priority: 0 }),
    ];
    expect(resolveDailyRate(65, rules, start, 5)).toBe(90);
  });

  it("picks the highest-priority rule among rules of the same type and scope", () => {
    const rules = [
      rule({ ruleType: "PROMOTIONAL", multiplier: 0.9, priority: 1 }),
      rule({ ruleType: "PROMOTIONAL", multiplier: 0.8, priority: 5 }),
    ];
    expect(resolveDailyRate(100, rules, start, 5)).toBe(80);
  });

  it("compounds SEASONAL, PROMOTIONAL, and LONG_TERM_DISCOUNT multipliers", () => {
    const rules = [
      rule({ ruleType: "SEASONAL", multiplier: 1.2 }),
      rule({ ruleType: "PROMOTIONAL", multiplier: 0.9 }),
      rule({ ruleType: "LONG_TERM_DISCOUNT", multiplier: 0.95 }),
    ];
    // 100 * 1.2 * 0.9 * 0.95 = 102.6
    expect(resolveDailyRate(100, rules, start, 5)).toBe(102.6);
  });

  it("applies the WEEKEND multiplier only to Friday/Saturday nights, blended across the stay", () => {
    // Tue Jan 12 -> Sun Jan 17, 2027: nights are Tue/Wed/Thu/Fri/Sat (3 weekday, 2 weekend).
    const tuesday = new Date("2027-01-12T00:00:00.000Z");
    const rules = [rule({ ruleType: "WEEKEND", multiplier: 2 })];

    // (3 * 100 + 2 * 200) / 5 = 140
    expect(resolveDailyRate(100, rules, tuesday, 5)).toBe(140);
  });

  it("leaves weekday nights unaffected by the WEEKEND rule when the stay has no weekend nights", () => {
    // Sun Jan 10 -> Fri Jan 15, 2027: nights are Sun/Mon/Tue/Wed/Thu — none are Fri/Sat.
    const rules = [rule({ ruleType: "WEEKEND", multiplier: 2 })];
    expect(resolveDailyRate(100, rules, start, 5)).toBe(100);
  });
});
