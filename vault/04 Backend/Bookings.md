---
status: accepted
owner: Backend Engineer
sprint: 6
---

# Bookings — Booking Workflow (Sprint 6, Module 2)

Second module of Sprint 6. Scope: booking creation, availability checks, confirmation, and cancellation. Pickup/return/ACTIVE/COMPLETED/NO_SHOW operational transitions, deposit-vs-full-payment policy, and auto-confirm-on-payment-success are later work (see Known gaps).

## Folder structure
```
apps/api/src/modules/bookings/
  domain/
    booking.repository.ts            — BookingRepository port, BookingOverlapError
    car-availability.repository.ts   — CarAvailabilityRepository port
  application/
    create-booking.use-case.ts
    get-booking.use-case.ts
    list-my-bookings.use-case.ts
    cancel-booking.use-case.ts
    confirm-booking.use-case.ts
    check-availability.use-case.ts
    booking.mapper.ts
  infrastructure/
    prisma-booking.repository.ts
    prisma-car-availability.repository.ts
  bookings.controller.ts
  bookings.module.ts
```

`CustomerProfileResolver` (Better Auth User -> CustomerProfile) was promoted from Payments-module-local to `apps/api/src/shared/customer/` (a small `@Global()` `CustomerModule`) the moment this module needed the exact same lookup — the textbook "wait for a second consumer" trigger for extracting a shared piece, not premature abstraction.

## Database: applying the Sprint-2-deferred raw-SQL migration
`vault/03 Database/Indexing-Strategy.md` and `Migration-Strategy.md` documented four raw-SQL follow-ups since Sprint 2 that Prisma's schema language can't express, explicitly deferred until a real write path justified them. Booking Workflow is that write path — migration `20260706081436_raw_sql_constraints` applies all four:
1. **`no_overlapping_bookings`** — a GiST exclusion constraint on `bookings` (`btree_gist` + a generated `date_range` column) that rejects two PENDING/CONFIRMED/ACTIVE bookings for the same car with overlapping dates, at the database level. Declared in `schema.prisma` as `dateRange Unsupported("daterange")? @map("date_range")` so `prisma migrate dev` knows the column exists and never tries to drop it as drift.
2. `payment_exactly_one_parent` — CHECK constraint, `Payment` must reference exactly one of booking/sale/paymentSchedule.
3. `invoice_at_most_one_parent` — CHECK constraint, `Invoice` references at most one of booking/sale.
4. `review_at_least_one_parent` — CHECK constraint, `Review` references at least one of car/booking/sale.

Plus the `cars_active_idx` partial index (the one table Indexing-Strategy.md gave an exact column list for). The doc explicitly defers the same partial-index pattern on `employees`/`customer_profiles`/`locations` "once real query patterns confirm which filters are actually hot" — not applied here, since guessing those columns now would be exactly the unjustified index that note warns against.

## Business rules
- Total = `resolveDailyRate(...) * ceil((endDate - startDate) / 1 day)`, minimum 1 day. **Update (Module 7):** the daily rate now comes from the `PricingRule` engine (BASE/SEASONAL/PROMOTIONAL/LONG_TERM_DISCOUNT/WEEKEND), not a flat `car.dailyRentalRate` — see `04 Backend/Booking-Rules.md` and ADR-018.
- Deposit = a flat 20% of the (rule-adjusted) total, isolated as a single named constant (`DEPOSIT_PERCENTAGE` in `create-booking.use-case.ts`) — still a placeholder; formalizing it needs new schema surface (no `DepositPolicy` model exists), unlike pricing which already had a fully-modeled, unused `PricingRule` table to wire up. See Booking-Rules.md's "Scope decision."
- `bookingNumber` generated as `BK-` + 8 hex chars from a UUID (mirrors the `DH-` reference pattern already used in `ManualBankTransferProvider`).

## API
| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/bookings/availability` | none (public) | Query: `carId`, `startDate`, `endDate`. Matches Cars being public — real booking sites let you check dates before signing in. |
| `POST` | `/api/bookings` | `booking:create` (CUSTOMER) | Creates a PENDING booking for the caller's own CustomerProfile. |
| `GET` | `/api/bookings/mine` | `booking:read` (CUSTOMER) | Paginated, optional `status` filter. |
| `GET` | `/api/bookings/:id` | `booking:read` (CUSTOMER) | 403 if the booking isn't the requester's own. |
| `POST` | `/api/bookings/:id/cancel` | `booking:cancel` (CUSTOMER) | Own booking only; only PENDING/CONFIRMED can be cancelled. |
| `POST` | `/api/bookings/:id/confirm` | `booking:update` (staff: SUPER_ADMIN, COMPANY_OWNER, BRANCH_MANAGER, CUSTOMER_SUPPORT) | No ownership check — only staff roles hold this permission. Only a PENDING booking can be confirmed. |

RBAC: `booking:create`/`booking:read`/`booking:cancel` granted to `CUSTOMER`; `booking:update` granted to the listed staff dashboard roles — both added to `prisma/seed.ts`. `booking:update` was deliberately **not** also granted to `CUSTOMER` — a customer holding a permission that the use-case logic wouldn't actually let them exercise (no ownership path for confirm) would be a misleading grant.

## Availability checking (two layers)
1. **Application-level pre-check** (`CarAvailabilityRepository.hasOverlap`) — queries `Booking` (status PENDING/CONFIRMED/ACTIVE, date range overlap) and `AvailabilityBlock` (reason MAINTENANCE/ADMIN_HOLD only — BOOKED-reason blocks aren't separately checked here since they'd just duplicate the Booking query). Fast, gives a clean `409` in the common case.
2. **Database-level backstop** (`no_overlapping_bookings` exclusion constraint) — catches the race the app-level check can't: two concurrent requests both passing the pre-check before either commits.

Cancelling a booking deletes its linked `AvailabilityBlock` row (in the same transaction as the status update) so the car's calendar doesn't stay stale — the exclusion constraint itself already stops counting a CANCELLED booking on its own (its `WHERE` clause only covers PENDING/CONFIRMED/ACTIVE), so this is about `AvailabilityBlock` data hygiene, not constraint correctness.

## Verified live
| Scenario | Result |
|---|---|
| Availability check (free range) | `{"available": true}` |
| Create booking | `201`, correct total (`dailyRate × days`) and 20% deposit |
| Availability check (now-overlapping range) | `{"available": false}` |
| Create overlapping booking (sequential) | Clean `409` from the app-level pre-check |
| **Two concurrent overlapping create requests fired in parallel** | One `201`, one `409` — the DB exclusion constraint is the actual arbiter here, not the app-level check (see below) |
| Customer without `booking:update` tries to confirm | `403` |
| Staff (`CUSTOMER_SUPPORT` role) confirms a PENDING booking | `200`, status → `CONFIRMED` |
| Confirm an already-CONFIRMED booking | `400` |
| Cancel own PENDING/CONFIRMED booking | `200`, status → `CANCELLED`, `cancelledAt`/`cancellationReason` set |
| Availability check after cancellation | `{"available": true}` again — `AvailabilityBlock` correctly released |
| Cancel an already-CANCELLED booking | `400` |
| Create a payment (Manual Bank Transfer) against a real booking, as its owning customer | `201` — confirms the Payments module (Sprint 6 Module 1) and this module integrate correctly now that real bookings exist |

**The concurrency test surfaced a real bug, fixed before shipping:** the first race attempt surfaced a raw `500` instead of a clean `409`. The actual Postgres error wasn't the expected `23P01` (exclusion_violation) — two transactions racing for the same GiST range instead deadlocked (`40P01`), which Postgres resolves by picking a victim transaction and aborting it. Both SQLSTATEs are now treated as the same "someone else got this slot first" outcome and translated to `409 Conflict`. Cross-referenced against the raw error's `.cause.code`/`.cause.originalCode`, not string-matched against the top-level message (which is just `"deadlock detected"`, not the SQLSTATE).

Full workspace gate (`npx turbo run build typecheck`) passes.

## Known gaps / next module
- Pickup/return, `ACTIVE`/`COMPLETED`/`NO_SHOW` transitions, damage reports, return reports — real Booking models already exist for these (`ReturnReport`, `DamageReport`, `InspectionReport`) but no use-cases yet; likely a "Rental Operations" concern, not this module.
- ~~Auto-confirming a booking when its linked Payment succeeds~~ — done in Payment Features (Module 3) and later moved to the `PaymentSucceededEvent` bus (Module 5, ADR-017).
- ~~No `PricingRule` engine~~ — done in Booking Rules (Module 7); see `04 Backend/Booking-Rules.md`. Deposit policy is still a flat percentage (that part remains a real gap — see Booking-Rules.md's "Scope decision").
- No admin-facing "all bookings" list — only self-service (customer) and single-action staff endpoints (confirm) exist; a full admin booking management view is an `apps/admin` concern for a later module.
