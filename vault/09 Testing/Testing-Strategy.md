---
status: accepted
owner: Backend Engineer
sprint: 6
updated: sprint 9 E2E/Playwright
---

# Testing Strategy

First real automated tests in this repo — `apps/api` had `"test": "vitest run"` in `package.json` since Sprint 1 but zero test files until Sprint 6 Module 6. This doc explains the approach so it stays consistent as coverage grows, not just a list of what exists today.

## Why unit tests on use-cases, not integration/e2e tests, first
Every backend module in this repo follows the Repository Pattern literally: a use-case depends on a domain **interface** (`PaymentRepository`, `BookingRepository`, `PaymentProviderRegistry`, etc.), never on Prisma or an external SDK directly. That means a use-case can be tested by constructing it with plain fake objects implementing those interfaces — no test database, no NestJS `TestingModule` bootstrapping, no real Stripe/ABA/KHQR calls. This is the concrete payoff of having built the architecture this way from Sprint 4 onward; Module 6 is where that investment gets cashed in.

```ts
const payments = { findById: vi.fn().mockResolvedValue(makePayment()) } as unknown as PaymentRepository;
const useCase = new CreateRefundUseCase(payments, refundsRepo, providerRegistry);
```

Integration tests (real Postgres, real HTTP requests) are still genuinely absent — this is unit coverage of business logic, not the whole pyramid. E2E coverage was added later (see "End-to-end tests (Sprint 9)" below) — don't claim more than what's actually documented in each section.

## Tooling
- **Vitest** (`apps/api/vitest.config.ts`) — `environment: "node"`, `include: ["src/**/*.spec.ts"]`. Runs unit tests directly against use-case classes constructed with `new`, bypassing Nest's DI container entirely (the container isn't needed to exercise business logic — it exists to wire real dependencies at runtime, not to enable testing).
- **`apps/api/tsconfig.build.json`** — added alongside the first test files. `nest build` was compiling `.spec.ts` files straight into `dist/` (confirmed by inspection: `find dist -iname "*.spec.js"` returned six files before this fix) because no build-time exclusion existed. This is NestJS's own standard scaffolded file (`extends: "./tsconfig.json"`, `exclude: ["node_modules", "test", "dist", "**/*.spec.ts"]`) — just never added because there was nothing to exclude before now.
- Fixture builders (`makePayment`, `makeBooking`, ...) construct realistic Prisma-shaped entities using `Prisma.Decimal` for money fields (`new Prisma.Decimal(65)`), not plain numbers cast through `as unknown as` — money-field types matter enough elsewhere in this codebase (Payments.md, Bookings.md) that tests should model them accurately rather than shortcut past the type.

## What's covered (Sprint 6 Module 6)
Prioritized by risk, not by "test everything" — each of these is either complex enough to plausibly hide a bug, or was explicitly flagged elsewhere in the vault as unverified:

| File | Why this one |
|---|---|
| `payments/application/create-refund.use-case.spec.ts` | Payments.md flagged the refund success path (partial→`PARTIALLY_REFUNDED`, full→`REFUNDED`, remaining-balance math) as "verified by code trace, not live execution" — no configured provider could complete a real refund. These tests close that gap with real assertions instead of a trace. |
| `payments/application/create-payment.use-case.spec.ts` | Idempotency replay/conflict, `amountDue` validation (ADR-015), ownership checks, and that a provider failure gets cached against the idempotency key correctly. |
| `bookings/application/create-booking.use-case.spec.ts` | Overlap rejection, the deposit/total math (ADR — flat 20% until Booking Rules), and that `BookingOverlapError` (the DB exclusion-constraint race backstop) is translated into a client-facing `409`. |
| `bookings/application/confirm-booking.use-case.spec.ts` | The idempotent no-op behavior added in Module 5 specifically to avoid double-sending a `BookingConfirmedEvent` — and that the event **is** emitted with the right payload on a real transition. |
| `bookings/application/cancel-booking.use-case.spec.ts` | Ownership check, the full set of non-cancellable statuses, and `BookingCancelledEvent` emission. |
| `payments/infrastructure/providers/aba-payway-payment.provider.spec.ts` | `signAbaPayWayFields` is a pure function with a precisely-specified algorithm (sort keys, concatenate values, HMAC-SHA512) — cheap to verify exactly, including against a hand-computed HMAC, not just "it returns a string." |

## What's covered (Sprint 7 Module 1 + Sprint 9 Phase 1-2 — added since, not previously logged here)
| File | Why this one |
|---|---|
| `ai/domain/recommendation-engine.spec.ts` | The deterministic (non-LLM) scoring function behind `GET /api/ai/recommendations` — pure logic, cheap to pin down exactly. |
| `ai/application/customer-assistant.use-case.spec.ts` | Grounding/escalation behavior of the chat use-case against real catalog/booking data. |
| `ai/application/list-ai-request-logs.use-case.spec.ts` | Pass-through with a query shape worth locking in. |
| `bookings/domain/pricing-rule-resolver.spec.ts` | BASE/SEASONAL/PROMOTIONAL/LONG_TERM_DISCOUNT/WEEKEND resolution added in Booking Rules (Module 7). |
| `payments/application/handle-payment-success.use-case.spec.ts` | `PaymentSucceededEvent` emission on the success transition. |
| `bookings/application/payment-succeeded.listener.spec.ts` | The per-listener try/catch isolation added in the Sprint 9 QA fix (one listener's failure must not mask or block Invoices'/Notifications' own listeners via `emitAsync`'s `Promise.all`). |

## What's covered (Sprint 9 Phase 3 — dedicated unit-test pass over 5 previously untested modules)
| File | Why this one |
|---|---|
| `shared/auth/permissions.guard.spec.ts` | `PermissionsGuard` is the actual security enforcement point for `@RequirePermissions` — this locks in allow/deny/aggregated-across-roles behavior, and specifically the documented "no metadata at all → fail open" behavior (intentionally public routes) so a future refactor can't silently flip it to fail-closed or vice versa without a test noticing. |
| `cars/infrastructure/prisma-car.repository.spec.ts` | `ListCarsUseCase`/`GetCarByIdUseCase` themselves are trivial passthroughs (no branching worth testing) — the real risk is the `where`-clause construction in `PrismaCarRepository.findMany`, specifically the non-obvious "a RENTAL/SALE search must also match BOTH-listed cars, but an explicit BOTH search stays exact" rule the code already comments on. Tested by faking only the Prisma client's `car.findMany`/`car.count` methods and asserting the constructed `where`/`skip`/`take` — no real database. |
| `dashboard/infrastructure/prisma-dashboard.repository.spec.ts` | `GetExecutiveSummaryUseCase` is a one-line passthrough — the actual aggregation math (`monthlyProfit = revenue - maintenance - payroll`), null-safe `Decimal` sum defaults (no data yet shouldn't throw or return `"NaN"`), the `car.groupBy` → `carsByStatus` mapping, and the 6-month trailing revenue trend all live in `PrismaDashboardRepository`. Tested the same way as the cars repository: fake the Prisma client's `aggregate`/`count`/`groupBy` methods, assert on the computed summary. |
| `invoices/application/generate-invoice-for-payment.use-case.spec.ts` | The ADR-016 "receipt, not bill" rule in one place: invoice number format (`INV-XXXXXXXX`), always `PAID` with `taxAmount: 0`, `issueDate === dueDate`, and the single line item mirroring the payment amount exactly. |
| `invoices/application/get-invoice.use-case.spec.ts` | Ownership check (a customer can only view their own invoice) — the same security-sensitive shape already tested for Payments/Bookings, now covered for Invoices too. |
| `notifications/application/create-notification.use-case.spec.ts` | The in-app-row-first, best-effort-email-second ordering the code's own doc comment claims: asserts `create` happens before `resolveEmail`, that a `null` email skips `send` entirely, and that `send` gets the right recipient/subject/body when an email does resolve. |
| `notifications/application/mark-notification-read.use-case.spec.ts` | Ownership check plus the idempotent no-op (already-read notifications don't call `markRead` again) — the same pattern already validated for `ConfirmBookingUseCase`. |

Deliberately not tested in this pass, with reasoning: `ListMyInvoicesUseCase`, `ListMyNotificationsUseCase`, and both mapper files (`invoice.mapper.ts`, `notification.mapper.ts`, `car.mapper.ts`) are pure passthrough/serialization with no branching worth locking in beyond what the contract's own Zod schema already enforces at the boundary. The Invoices' and Notifications' own `payment-succeeded.listener.ts` files were also skipped — they're the same try/catch-isolation shape already covered once by `bookings/application/payment-succeeded.listener.spec.ts`; adding near-identical specs for the other two listeners would be padding, not new coverage of distinct logic. `ResendEmailSender` (Notifications infra) and `auth/auth.ts` (Better Auth config, not this repo's own logic) remain out of scope per this doc's existing rule against needing a real network call or a real SDK to exercise.

Not covered yet, and not pretended to be: `InstallmentScheduleRepository`'s Prisma transaction logic (needs a real or in-memory Postgres, not a fake), the webhook controllers (need an HTTP layer), KHQR/Stripe provider adapters (already verified live in Payments.md — QR generation against the real SDK, clean `503`s when unconfigured — which a mocked unit test would only re-assert weakly), and `ResendEmailSender`.

## End-to-end tests (Sprint 9 — Playwright, added after being deferred from the earlier unit-test pass)
First real E2E coverage in this repo — `e2e/` is a new top-level workspace (`@drivehub/e2e`, added to the root `workspaces` array) rather than living under `apps/`, since it drives three already-existing apps (`apps/api`, `apps/web`, `apps/admin`) as black boxes instead of being one itself.

**Why this is a separate command, not part of the fast gate.** `npx turbo run build typecheck lint test` stays fast and dependency-free (fakes/mocks, no live server) — wiring Playwright into that would make every one of those runs slow and flaky on whatever's already listening on a port. `npm run test:e2e` (root script) is the dedicated, deliberately separate entry point: it builds `@drivehub/contracts`/`@drivehub/database` first (so a fresh checkout doesn't hit stale `dist/`), then runs `playwright test`, whose own `webServer` config starts real `nest start --watch`, `next dev --turbopack -p 3010` (web), and `next dev --turbopack -p 3011` (admin) processes against local Postgres — genuinely one command, no manual server juggling.

**Fixed ports, only for Playwright.** `apps/web` and `apps/admin` both run plain `next dev --turbopack` with no port pinned for normal local dev — whichever starts first grabs 3000, the other auto-increments, which is fine for a human running one at a time but flaky for `webServer` orchestration. `e2e/support/urls.ts` pins 3010 (web) / 3011 (admin) / 4000 (api, already fixed) — passed via `-p` only in how `playwright.config.ts` itself launches these dev servers; `npm run dev` elsewhere is untouched.

**Chromium only.** No existing cross-browser requirement in this repo; one project keeps the suite fast enough to actually run locally, not just in CI (which doesn't run it yet either — intentionally out of the `.github/workflows/ci.yml` fast gate, see above).

**No test-DB reset exists**, and the seed data is exactly one car (the Toyota Camry, VIN `4T1B11HK5KU123456`) plus one demo `CONFIRMED` booking (2026-08-01..05) — both specs create their own fresh data every run instead of relying on a clean slate: a timestamp+random unique email per registered account, and a randomized future date window per spec (`futureBookingWindow` in `e2e/support/test-data.ts`) so repeat runs, and the two spec files running in parallel, never collide with each other or the fixed demo booking on the GiST exclusion constraint (Bookings.md/ADR-014) that rejects overlapping bookings for the same car.

**Customer journey** (`e2e/tests/customer-journey.spec.ts`) — register (real `/sign-up` form) → log out → log back in (real `/sign-in` form) → search cars via the real `/cars` filter UI and find the seeded Camry → book it with real future dates through the real booking widget → pay the deposit via Manual Bank Transfer (the only provider that's genuinely E2E-testable without real credentials — see Payments.md) and assert it lands `PENDING` with a reference/bank instructions shown → a real `POST /api/payments/:id/confirm-manual` call, authenticated as the seeded Super Admin via Playwright's isolated `request` fixture (kept independent of the customer's own browser session) → reload and assert the booking flips to `CONFIRMED` and the exact invoice (matched by its `Payment <reference>` line item) appears on the account page.

**Admin journey** (`e2e/tests/admin-journey.spec.ts`) — a throwaway customer/booking/pending-payment is created via direct API calls first (fixture setup, not the thing under test), then: log in as the seeded Super Admin through the real `/sign-in` form → since neither an "Add Car" nor an "Approve Booking" admin UI exists yet (`apps/api`'s cars module only exposes `GET` endpoints; `apps/admin` only has `/sign-in` and `/dashboard`), the payment confirmation is a real API call reusing the admin's own already-authenticated browser session (`page.request`, no UI to drive) rather than a fabricated button → assert the confirmation's real effect (booking `CONFIRMED`, invoice generated) via the fixture customer's own session → view the executive dashboard and assert real KPI data renders (`Available Cars` = 1, matching the single-car seed exactly).

**Deliberately skipped, not fabricated:** booking pickup/return and rental completion (`ACTIVE`/`COMPLETED`/`NO_SHOW` transitions) are explicitly deferred per Bookings.md — there's no real endpoint or UI to drive, so neither spec attempts a "Return Vehicle" or "Complete Rental" step. "Add Car" is skipped for the same reason (no create-car endpoint or admin UI exists). Stripe, ABA PayWay, and KHQR's payment-received confirmation are skipped — all three are inert `503`s or need a live Bakong account without real credentials (Payments.md). E2E coverage should be revisited once any of these ship.

**Running it:**
```bash
npm run test:e2e   # root script — builds contracts/database, then `playwright test` against fresh local dev servers + local Postgres
npm run test:e2e --workspace=@drivehub/e2e   # equivalent, skips the contracts/database rebuild
npm run test:e2e:ui --workspace=@drivehub/e2e   # Playwright's interactive UI mode
```

## A note on testing Prisma-backed repositories directly (Sprint 9 Phase 3)
The Sprint 6 pattern above is "test use-cases, fake the repository interface" — that still holds as the default. But for Cars and Dashboard, the actual risk-bearing logic (filter/`where`-clause construction, aggregation math) lives inside the concrete `Prisma*Repository` class itself, because their use-cases are pure one-line passthroughs to the repository. In those two cases specifically, the test constructs the real repository class with `new` and fakes only the handful of `PrismaService.client.<model>.<method>` calls it actually invokes (still no test database, no `TestingModule`) — the same "fake the boundary, not the whole world" principle, just applied one layer down because that's where the logic actually is.

## Running tests
```bash
npm run test --workspace=@drivehub/api   # or: cd apps/api && npx vitest run
npx turbo run build typecheck lint test   # full workspace gate — unit tests only, no live servers
npm run test:e2e                          # separate, slower — see "End-to-end tests" above
```
`turbo.json` already had a `test` task wired (`dependsOn: ["^build"]`) since the monorepo was scaffolded — it just had nothing to run until now. `test:e2e` is deliberately not part of the `turbo run` gate — it needs live dev servers and local Postgres, not just fakes.
