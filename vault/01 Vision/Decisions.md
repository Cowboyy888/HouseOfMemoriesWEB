---
status: living-document
owner: CEO Agent / Software Architect
sprint: 0
---

# Architecture Decision Log

Every cross-cutting decision made during discovery is recorded here so later agents (Architect, DB Engineer, Backend/Frontend Engineer) don't re-litigate it. Append new ADRs; do not delete old ones — mark superseded ones as `Superseded by ADR-00X`.

## ADR-001 — Target Market & Locale Strategy
- **Date:** 2026-07-05
- **Decision:** Primary market is the United States (USD). Multi-language (i18n) infrastructure is built starting Sprint 1 using `next-intl`, even though English is the only shipped locale at MVP launch.
- **Rationale:** Retrofitting i18n into a Next.js App Router project after routes/components already exist is expensive — it changes the routing structure (`/[locale]/...`). Cheaper to scaffold locale-aware routing now and add translation files incrementally.
- **Status:** Accepted

## ADR-002 — Shared Fleet Inventory Model
- **Date:** 2026-07-05
- **Decision:** Car Rental and Car Sales share a single `Vehicle` entity/table, differentiated by a `listingType` (`RENTAL`, `SALE`, `BOTH`) and a `status` state machine.
- **Rationale:** Matches real-world dealerships that both rent and sell from the same lot; avoids duplicating vehicle master data (VIN, specs, media, condition, maintenance history) across two schemas.
- **Status:** Accepted

## ADR-003 — Monorepo Tooling: Turborepo
- **Date:** 2026-07-05
- **Decision:** Use Turborepo to orchestrate the Next.js frontend app, NestJS backend app, and shared packages (types, UI, config).
- **Rationale:** Best-in-class Next.js integration, simple pipeline config, remote caching, lower operational overhead than Nx for a two-app monorepo.
- **Status:** Accepted

## ADR-004 — Payment Provider: Stripe
- **Date:** 2026-07-05
- **Decision:** Stripe is the payment provider for rental deposits/holds and car-sale transactions.
- **Rationale:** Native support for card holds (rental deposits), refunds, and Stripe Connect (future multi-branch payouts). Strongest SDK support for the NestJS/Next.js stack.
- **Status:** Accepted
- **Follow-up:** Payment integration will still go through a `PaymentProvider` interface (Repository/Strategy pattern) so Stripe is swappable without touching domain logic.

## ADR-005 — Obsidian Vault Location
- **Date:** 2026-07-05
- **Decision:** The Obsidian vault lives inside the monorepo at `/vault`, version-controlled alongside code.
- **Rationale:** The master prompt requires documentation to update whenever code changes; co-locating vault and code means doc updates land in the same commits/PRs as the features they describe.
- **Status:** Accepted

## ADR-006 — Brand Name Deferred
- **Date:** 2026-07-05
- **Decision:** Ship Sprint 0–1 under the placeholder brand "DriveHub" (repo name, package scope `@drivehub/*`, vault title). Real branding to be swapped in later via a tracked rename pass.
- **Rationale:** User has not finalized a brand name; blocking all scaffolding on naming would stall architecture/database work that doesn't depend on it.
- **Status:** Accepted — revisit when user provides final name.

## ADR-007 — Admin Dashboard is a Separate App (`apps/admin`)
- **Date:** 2026-07-06
- **Decision:** The staff Admin Dashboard is a fourth workspace package, not a route group inside `apps/web`.
- **Rationale:** Different audience (internal staff vs. anonymous/customer), different risk profile (RBAC-gated data shouldn't ship in the public bundle), matches the monorepo's existing feature-based split. See `06 Dashboard/Architecture.md`.
- **Status:** Accepted

## ADR-008 — RBAC Enforcement: Middleware + Guard, Not Duplicated in the Frontend
- **Date:** 2026-07-06
- **Decision:** `SessionMiddleware` attaches the Better Auth session to every NestJS request; `PermissionsGuard` + `@RequirePermissions(...)` enforce authorization server-side. Frontend `AuthGuard` only checks *authentication* (redirect to sign-in if no session) — it never re-implements the permission check.
- **Rationale:** The Sprint 5 brief explicitly says "never duplicate backend logic." A client-side permission copy would drift from the server's the moment a role's permissions change.
- **Status:** Accepted. See `04 Backend/RBAC.md`.

## ADR-009 — Revenue Reporting Temporarily Reads `Payment`, Not `RevenueLedgerEntry`
- **Date:** 2026-07-06
- **Decision:** The Executive Dashboard computes revenue from `SUM(Payment.amount WHERE status=SUCCEEDED)` instead of the `RevenueLedgerEntry` ledger the Sprint 2 schema doc designates as the source of truth.
- **Rationale:** Nothing writes to `RevenueLedgerEntry` yet — no booking-confirmation/payment-processing use case exists (Booking Management is a future module). Reading from an empty table would make the dashboard always show $0. This is a **temporary, documented substitution** to revisit once that use case exists and starts populating the ledger.
- **Status:** Accepted, superseding note pending Booking Management module. See `06 Dashboard/Executive-Dashboard.md`.

## ADR-010 — Design System Sourcing: Two Skills, Two Domains
- **Date:** 2026-07-06
- **Decision:** UI chrome (sidebar, cards, buttons, typography) uses the `ui-ux-pro-max` skill's generated design system (navy/slate "Trust & Authority," Fira Code/Fira Sans). Chart series colors use the `dataviz` skill's separately-validated categorical palette instead of colors derived from the UI palette.
- **Rationale:** A UI-chrome palette isn't validated for colorblind-safe data encoding; the two skills each own a different, non-overlapping concern and are combined rather than one overriding the other.
- **Status:** Accepted

## ADR-011 — Deployment Platforms Corrected from the Original Stack
- **Date:** 2026-07-06
- **Decision:** Deploy `apps/web` to **Vercel** (not Cloudflare Pages), `apps/api` to **Railway** via a real Dockerfile (not Cloudflare Containers), Postgres to **Neon** (not named in the original stack at all).
- **Rationale:** Checked live (not from training memory): Cloudflare deprecated Next.js-on-Pages support (incompatible with Next.js 15+); its Workers-based replacement (`@opennextjs/cloudflare`) reached GA in Feb 2026 but was still a bigger lift than needed for a first launch. Cloudflare Containers remains beta (no SLA). User chose Vercel/Railway/Neon directly when presented with this tradeoff.
- **Status:** Accepted. See `08 Deployment/Production.md`.

## ADR-012 — Shared Allowed-Origins Config for CORS + Better Auth
- **Date:** 2026-07-06
- **Decision:** `apps/api/src/shared/config/allowed-origins.ts` is the single place both `main.ts`'s CORS config and `auth.ts`'s `trustedOrigins` read from (`WEB_ORIGINS`, comma-separated).
- **Rationale:** Once there were two live frontend origins (dev, then prod Vercel), keeping CORS and Better Auth's own origin allowlist in sync by hand was a real drift risk — a mismatch fails silently as a real `403`, not an obvious error.
- **Status:** Accepted

## ADR-013 — Payment Providers: Add ABA PayWay and KHQR Behind the Same Interface; Official SDK Required for KHQR
- **Date:** 2026-07-06
- **Decision:** Sprint 6 adds Cambodia-market payment methods (ABA PayWay, KHQR) and Manual Bank Transfer alongside Stripe, all behind the `PaymentProviderPort` interface from ADR-004. KHQR is implemented using the official `bakong-khqr` npm package rather than a hand-rolled EMV/TLV/CRC encoder.
- **Rationale:** A subtly-wrong hand implementation of the KHQR spec would produce QR codes that *look* valid but fail to scan — worse than not building the feature. The official SDK's `generateMerchant()` is a pure local function (no network, no live merchant credentials), so QR generation is genuinely testable even without real Bakong onboarding; only checking whether a generated QR was actually paid needs live credentials.
- **Status:** Accepted. See `04 Backend/Payments.md` for the full provider writeup, including the unverified-transaction-status-endpoint caveat and ABA PayWay's lower-confidence field contract.

## ADR-014 — Applied the Sprint-2-Deferred Raw-SQL Constraint Migration; Booking Overlap Enforced at the Database Level
- **Date:** 2026-07-06
- **Decision:** Sprint 6 Module 2 (Booking Workflow) applies the raw-SQL follow-up migration documented since Sprint 2 (`Indexing-Strategy.md`/`Migration-Strategy.md`) but never previously run: a GiST exclusion constraint preventing overlapping active bookings for the same car, plus three "exactly/at-most/at-least one parent" CHECK constraints (Payment, Invoice, Review) and the `cars_active_idx` partial index.
- **Rationale:** These were explicitly deferred until a real write path needed them — Booking Workflow's `CreateBookingUseCase` is that path. An application-level overlap check alone can't close the race between two concurrent booking requests for the same car/dates; verified live by firing two concurrent overlapping create requests, one of which correctly failed (first as an unhandled `500` from a Postgres deadlock, then — after widening the error detection to cover both `23P01` exclusion-violation and `40P01` deadlock SQLSTATEs — as a clean `409`).
- **Status:** Accepted. See `04 Backend/Bookings.md`.

## ADR-015 — Payment Amounts Are Server-Validated Against the Payable; Manual Bank Transfers Need an Explicit Staff Confirmation Step
- **Date:** 2026-07-06
- **Decision:** `CreatePaymentUseCase` now rejects any payment whose `amount` doesn't exactly match the payable's computed `amountDue` (deposit, remaining installment, or remaining sale price — net of already-`SUCCEEDED` payments). A new staff-only `POST /api/payments/:id/confirm-manual` marks a Manual Bank Transfer payment `SUCCEEDED` once verified against the real bank statement.
- **Rationale:** Live-testing the deposit flow (Sprint 6 Module 3) found that Manual Bank Transfer payments — which start `PENDING` and have no external system to poll — could never reach `SUCCEEDED` through any existing code path, so a customer could submit unlimited duplicate deposit payments against one booking (amount validation alone wasn't enough, since it only nets out `SUCCEEDED` payments). Booking confirmation could already be done directly, but nothing ever confirmed the underlying *payment*, leaving the two records permanently out of sync for that provider.
- **Also decided:** `HandlePaymentSuccessUseCase` (auto-confirm a booking, record an installment payment) is a direct cross-module DI import (`PaymentsModule` → `BookingsModule`'s exported `ConfirmBookingUseCase`), not a domain-event bus — the simplest thing that works for one consumer. Revisit as an event if a second consumer (e.g. Notifications) needs the same "payment succeeded" hook. *(Superseded by ADR-017 — Notifications became a third consumer and this was replaced with an event bus.)*
- **Status:** Accepted. See `04 Backend/Payments.md`.

## ADR-016 — Invoices Are Generated as Post-Payment Receipts, Not Pre-Payment Bills
- **Date:** 2026-07-06
- **Decision:** `GenerateInvoiceForPaymentUseCase` creates one `Invoice` (status `PAID`) per successful payment, regardless of payable type or provider — not a `DRAFT`/`ISSUED` invoice created ahead of payment and settled later.
- **Rationale:** Money is already collected directly through the Payments API, which validates the exact amount owed (ADR-015's `amountDue`) before accepting a payment — there's no "send a bill, wait for it to be paid" flow anywhere in this system to hang a pre-payment invoice lifecycle off of. Modeling one anyway would be speculative. `DRAFT`/`ISSUED`/`VOID` remain on the `InvoiceStatus` enum for a real future use (e.g. a staff-issued invoice for an ad-hoc fee) but aren't produced by anything yet.
- **Status:** Accepted. See `04 Backend/Invoices.md`.

## ADR-017 — Payment-Success Side Effects Moved from Direct Cross-Module Imports to a Domain Event Bus
- **Date:** 2026-07-06
- **Decision:** `PaymentsModule` no longer imports `BookingsModule`/`InvoicesModule` directly. `HandlePaymentSuccessUseCase` emits `PaymentSucceededEvent` (via `@nestjs/event-emitter`); Bookings, Invoices, and the new Notifications module each listen for it independently. `ConfirmBookingUseCase`/`CancelBookingUseCase` similarly emit `BookingConfirmedEvent`/`BookingCancelledEvent` for Notifications to react to.
- **Rationale:** ADR-015 and ADR-016 both flagged the same threshold in advance — a direct cross-module import was the simplest thing that worked for one or two consumers, but a third (Notifications) would mean `PaymentsModule` depending on every module that ever wants to know a payment succeeded. Followed through on that plan rather than adding a third import.
- **Status:** Accepted. See `04 Backend/Notifications.md`.

## ADR-018 — Booking Rate Resolution Wires Up `PricingRule`; Deposit Policy Stays a Placeholder
- **Date:** 2026-07-06
- **Decision:** `CreateBookingUseCase`/`CheckAvailabilityUseCase` now resolve the effective daily rate from active `PricingRule` rows (BASE override, SEASONAL/PROMOTIONAL/LONG_TERM_DISCOUNT multipliers compounding, WEEKEND multiplier blended across only Friday/Saturday nights) instead of a flat `car.dailyRentalRate`. Deposit remains a flat 20% constant.
- **Rationale:** `PricingRule` has been fully modeled since Sprint 2 and unused — wiring it up is completing existing, already-designed schema surface. A `DepositPolicy` model (or equivalent field) does not exist anywhere in the schema; formalizing deposit policy would mean *introducing* new schema surface the original design didn't call for, which is a materially different (and out-of-scope-for-this-module) kind of change than activating an existing table.
- **Status:** Accepted. See `04 Backend/Booking-Rules.md`.

## ADR-019 — AI Provider Abstraction: Same Strategy Pattern as Payments, Config-Selected Not Customer-Selected
- **Date:** 2026-07-07
- **Decision:** `AiProviderPort` (OpenAI, Anthropic) follows the exact Repository/Strategy pattern established for `PaymentProviderPort` (ADR-004/013), but the concrete provider is chosen once via an `AI_PROVIDER` env var, not per-request like a customer picking a payment method — nothing about which LLM answers a chat message is the customer's decision.
- **Rationale:** Sprint 7's brief explicitly asks to "allow switching AI providers through configuration." Reusing an already-proven pattern (rather than inventing a new one for AI) keeps the codebase's abstraction style consistent. Verified live that the switch is real, not just structurally present: the same failing request reported a different unconfigured-provider error message when `AI_PROVIDER` was toggled.
- **Status:** Accepted. See `07 AI/Customer-Assistant.md`.

## ADR-020 — Sprint 9 Security Hardening: Per-Listener Isolation, Global Helmet/Throttling, Provider-Error Translation
- **Date:** 2026-07-10
- **Decision:** Six findings from a Sprint 9 QA/Security audit were fixed: (1) each `PaymentSucceededEvent` listener (Bookings/Invoices/Notifications) now catches and logs its own errors instead of letting one failure reject `emitAsync`'s `Promise.all` for all three (ADR-017's event bus was correct; only its failure-isolation was missing); (2) `helmet()` is now applied globally in `main.ts` with default config (no Swagger/inline-script surface in this repo to relax it for); (3) `@nestjs/throttler` is now global (60 req/min/IP default) with stricter per-route overrides on the unauthenticated `POST /api/ai/chat` (10/min, real LLM-billed) and `GET /api/ai/recommendations` (20/min); (4) `GET /api/ai/logs?limit=` now validates through a new `AiRequestLogQuerySchema` (`packages/contracts`) instead of raw `Number()`; (5) Stripe and KHQR payment providers now translate live network/API failures (`StripeConnectionError`/`StripeAPIError`, KHQR's `fetch()` failing) into `ServiceUnavailableException` instead of an uncaught 500, consistent with how each already handles the "not configured" case; (6) Better Auth's `sendResetPassword` is wired to the existing `ResendEmailSender` (inert without `RESEND_API_KEY`, same pattern as Stripe/OAuth) — password reset previously had no email delivery path at all.
- **Rationale:** All six were independently verified against the live source (not assumed) by a read-only Code Quality + Security audit pass, then reproduced and fixed one-for-one. Rate limits (60/10/20 per minute) are a judgment call sized for a small-to-mid-traffic API rather than a measured production baseline — revisit once real traffic data exists.
- **Status:** Accepted. See `04 Backend/Payments.md` and `04 Backend/Notifications.md` for the modules touched; no new per-module doc created since this is a hardening pass across existing modules, not a new one.

## ADR-021 — E2E Coverage: Top-Level `e2e/` Workspace, Chromium-Only, Fixed Ports Only for Playwright
- **Date:** 2026-07-10
- **Decision:** First Playwright/E2E coverage in this repo, deferred from the Sprint 6 unit-test pass and Sprint 9's own Phase 3. Added as a new top-level `@drivehub/e2e` workspace (`e2e/`, in the root `workspaces` array) rather than under `apps/`, since it drives `apps/api` + `apps/web` + `apps/admin` as black boxes rather than being a fourth app itself. `playwright.config.ts`'s `webServer` starts all three live (real `nest start --watch`, two `next dev --turbopack` instances) against local Postgres; `apps/web`/`apps/admin` normally run unpinned ports (first up gets 3000, the other auto-increments), which is fine for a human but flaky for automated orchestration — Playwright alone pins them to 3010/3011 via its own launch command (`next dev --turbopack -p <port>`, the app's own `dev` script unchanged), while `apps/api`'s existing fixed port 4000 needed no change. Single Chromium project only (no existing cross-browser requirement). New root script `npm run test:e2e` is deliberately separate from `npm run test`/`turbo run test` — it needs live servers and isn't cacheable/parallelizable the way the fake-based unit tests are.
- **Rationale:** No test-DB reset exists and the seed data is a single car — both new specs (customer journey, admin journey) create fresh, uniquely-timestamped accounts and randomized non-overlapping future date windows so repeat runs and parallel spec files never collide with each other or the fixed seed demo booking on the GiST exclusion constraint (ADR-014). The customer journey performs its own staff-side `POST /api/payments/:id/confirm-manual` call (via an isolated Playwright `request` context, separate from its own browser session) rather than depending on the admin spec's execution — the two spec files must each run independently, in any order. Neither "Add Car" nor "Approve Booking" has a real admin UI yet (cars module is GET-only; admin app has only `/sign-in` and `/dashboard`) — deliberately not fabricated; both are exercised as real authenticated API calls instead, documented as deferred until those UIs ship.
- **Status:** Accepted. See `09 Testing/Testing-Strategy.md`'s new "End-to-end tests" section for what's covered, what's deliberately skipped (booking pickup/return, rental completion, Add Car — none of these exist yet), and the exact commands.
