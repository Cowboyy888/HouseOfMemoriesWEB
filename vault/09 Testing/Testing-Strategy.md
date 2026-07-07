---
status: accepted
owner: Backend Engineer
sprint: 6
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

Not covered yet, and not pretended to be: `InstallmentScheduleRepository`'s Prisma transaction logic (needs a real or in-memory Postgres, not a fake), the webhook controllers (need an HTTP layer), KHQR/Stripe provider adapters (already verified live in Payments.md — QR generation against the real SDK, clean `503`s when unconfigured — which a mocked unit test would only re-assert weakly), and the Notifications module's listeners.

## Running tests
```bash
npm run test --workspace=@drivehub/api   # or: cd apps/api && npx vitest run
npx turbo run build typecheck test        # full workspace gate, now includes test
```
`turbo.json` already had a `test` task wired (`dependsOn: ["^build"]`) since the monorepo was scaffolded — it just had nothing to run until now.
