---
status: accepted
owner: Backend Engineer
sprint: 6
---

# Booking Rules — Pricing Engine (Sprint 6, Module 7)

Seventh module of Sprint 6. Wires up the `PricingRule` model, which has existed since the Sprint 2 schema (`03 Database/Schema-Overview.md`, `Indexing-Strategy.md`) but was never read from — `CreateBookingUseCase` used a flat `car.dailyRentalRate × days` since Module 2, with `DEPOSIT_PERCENTAGE` explicitly commented as a placeholder "until Sprint 6's Booking Rules module formalizes deposit policy."

## Scope decision: pricing, not deposit policy
This module wires up `PricingRule` (fully modeled, unused) but leaves the flat 20% deposit as-is. Formalizing deposit policy (per-category minimums, etc.) would need **new schema surface** — no `DepositPolicy` model or `CarCategory.depositPercentage` field exists anywhere in the Sprint 2 schema. Wiring up an existing, already-designed-for model is a different (and smaller) kind of work than introducing new schema the original database design didn't call for. `DEPOSIT_PERCENTAGE` remains a named constant in `create-booking.use-case.ts` for exactly this reason — isolated so a future model can replace it without touching the surrounding logic.

## Folder structure
```
apps/api/src/modules/bookings/domain/
  pricing-rule.repository.ts   — PricingRuleRepository port, ApplicablePricingRule
  pricing-rule-resolver.ts     — resolveDailyRate() (pure function), computeNightCount()
apps/api/src/modules/bookings/infrastructure/
  prisma-pricing-rule.repository.ts
```
Also touched: `CreateBookingUseCase` (uses the resolved rate instead of the car's raw rate), `CheckAvailabilityUseCase` (now returns a price preview), `CarAvailabilityRepository`'s `RentableCar` (gained `categoryId`), and the `AvailabilityResult` contract (gained `estimatedDailyRate`/`estimatedTotalAmount`).

## Resolution algorithm
Given a car, its category, and a date range:
1. **BASE** — a matching `BASE` rule's `flatRate` replaces `car.dailyRentalRate` entirely. A **car-specific** `BASE` rule always wins over a **category-level** one of the same type — this is an override relationship, not a priority tiebreak, per the schema's own comment: *"carId set = override for one specific vehicle; categoryId set = default for a whole category."* Only when there's no car-specific rule of a type does priority pick among category-level candidates.
2. **SEASONAL**, **PROMOTIONAL**, **LONG_TERM_DISCOUNT** — each contributes a `multiplier` that compounds (multiplies) onto the base rate. `LONG_TERM_DISCOUNT` is naturally gated by the rule's own `minDays` (filtered at the repository query level — a rule with `minDays: 7` simply isn't "applicable" for a 3-night stay).
3. **WEEKEND** — also a multiplier, but applied only to nights that fall on Friday or Saturday (the standard car-rental "weekend rate" convention). Since `Booking` stores one `dailyRate`, not per-night rates, this resolver returns a single **blended** effective rate: `(weekdayNights × weekdayRate + weekendNights × weekendRate) / totalNights`. This is a considered simplification (documented here, not silently assumed), not a full per-night pricing model — that would need a schema change (a per-night rate table) beyond this module's scope.

## Price preview before booking
`GET /api/bookings/availability` now returns `estimatedDailyRate`/`estimatedTotalAmount` (null when unavailable) alongside `available` — computed via the exact same `resolveDailyRate()` call `CreateBookingUseCase` uses, via a shared `computeNightCount()` helper, so the preview can never disagree with the price the booking is actually created at.

## Verified live
Seeded two real `PricingRule` rows against the demo car/category (not mocked) and confirmed via real HTTP calls:
| Scenario | Result |
|---|---|
| Category-level `SEASONAL` rule, multiplier 1.25, on a $65/day car | Availability preview: `$81.25/day`, `$406.25` total (5 nights) |
| Creating the booking in the same window | `dailyRate: "81.25"`, `totalAmount: "406.25"` — **exactly matches the preview**, not just close |
| Added a car-specific `BASE` rule (`flatRate: 50`) on top of the category `SEASONAL` rule | `$50 × 1.25 = $62.50/day` — confirms the override-then-compound order (car-specific base first, then category-level multipliers), not just that rules apply at all |

Unit tests (`pricing-rule-resolver.spec.ts`, 9 cases) cover the parts hardest to verify by hand-inspection alone: car-specific-overrides-category regardless of priority value, priority tiebreak among same-scope rules, three multipliers compounding correctly, and the weekend/weekday blend math (verified against a hand-computed expected value: 3 weekday nights @ $100 + 2 weekend nights @ $200, blended to exactly $140/night).

Full workspace gate (`npx turbo run build typecheck test`) passes.

## Known gaps / next steps
- Deposit policy is still a flat 20% — see "Scope decision" above.
- No admin UI to create/manage `PricingRule` rows yet — verified this module by writing rows directly via Prisma; a real staff-facing pricing-rule management screen is an `apps/admin` concern for a later module.
- WEEKEND blending assumes Friday/Saturday universally; a `Location`-specific weekend definition (some markets treat Thursday night as the start of the weekend) isn't modeled — not needed by anything built so far.
- No caching of rule resolution — every availability check and booking creation re-queries `PricingRule`. Fine at current scale (a handful of rules per car/category, per `Indexing-Strategy.md`'s own sizing assumption); revisit if that assumption changes.
