---
status: accepted
owner: Backend Engineer
sprint: 6
updated: sprint 9 phase 3
---

# Testing Strategy

First real automated tests in this repo — `apps/api` had `"test": "vitest run"` in `package.json` since Sprint 1 but zero test files until Sprint 6 Module 6. This doc explains the approach so it stays consistent as coverage grows, not just a list of what exists today.

## Why unit tests on use-cases, not integration/e2e tests, first
Every backend module in this repo follows the Repository Pattern literally: a use-case depends on a domain **interface** (`PaymentRepository`, `BookingRepository`, `PaymentProviderRegistry`, etc.), never on Prisma or an external SDK directly. That means a use-case can be tested by constructing it with plain fake objects implementing those interfaces — no test database, no NestJS `TestingModule` bootstrapping, no real Stripe/ABA/KHQR calls. This is the concrete payoff of having built the architecture this way from Sprint 4 onward; Module 6 is where that investment gets cashed in.

```ts
const payments = { findById: vi.fn().mockResolvedValue(makePayment()) } as unknown as PaymentRepository;
const useCase = new CreateRefundUseCase(payments, refundsRepo, providerRegistry);
```

Integration tests (real Postgres, real HTTP requests) and e2e tests (Playwright against a running frontend) are still genuinely absent — this is unit coverage of business logic, not the whole pyramid. Don't claim more than that.

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

Not covered yet, and not pretended to be: `InstallmentScheduleRepository`'s Prisma transaction logic (needs a real or in-memory Postgres, not a fake), the webhook controllers (need an HTTP layer), KHQR/Stripe provider adapters (already verified live in Payments.md — QR generation against the real SDK, clean `503`s when unconfigured — which a mocked unit test would only re-assert weakly), `ResendEmailSender`, and any E2E/Playwright coverage (separate, still not started).

## A note on testing Prisma-backed repositories directly (Sprint 9 Phase 3)
The Sprint 6 pattern above is "test use-cases, fake the repository interface" — that still holds as the default. But for Cars and Dashboard, the actual risk-bearing logic (filter/`where`-clause construction, aggregation math) lives inside the concrete `Prisma*Repository` class itself, because their use-cases are pure one-line passthroughs to the repository. In those two cases specifically, the test constructs the real repository class with `new` and fakes only the handful of `PrismaService.client.<model>.<method>` calls it actually invokes (still no test database, no `TestingModule`) — the same "fake the boundary, not the whole world" principle, just applied one layer down because that's where the logic actually is.

## Running tests
```bash
npm run test --workspace=@drivehub/api   # or: cd apps/api && npx vitest run
npx turbo run build typecheck test        # full workspace gate, now includes test
```
`turbo.json` already had a `test` task wired (`dependsOn: ["^build"]`) since the monorepo was scaffolded — it just had nothing to run until now.
