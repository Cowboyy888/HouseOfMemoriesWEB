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
