export interface ApplicablePricingRule {
  ruleType: "BASE" | "WEEKEND" | "SEASONAL" | "LONG_TERM_DISCOUNT" | "PROMOTIONAL";
  /** Set when this rule targets one specific vehicle rather than its whole
   * category — takes precedence over a category-level rule of the same
   * type (see the schema comment on PricingRule: "carId set = override for
   * one specific vehicle; categoryId set = default for a whole category"). */
  isCarSpecific: boolean;
  multiplier: number | null;
  flatRate: number | null;
  priority: number;
}

export const PRICING_RULE_REPOSITORY = Symbol("PRICING_RULE_REPOSITORY");

export interface PricingRuleRepository {
  /** Active rules (car-specific or category-level) whose validity window
   * covers the given date range and whose minDays (if any) is satisfied by
   * the given day count — the minDays/date-window filtering happens here so
   * the resolver never has to re-derive "is this rule in effect." */
  findApplicable(carId: string, categoryId: string, startDate: Date, endDate: Date, days: number): Promise<ApplicablePricingRule[]>;
}
