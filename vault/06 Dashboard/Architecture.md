---
status: accepted
owner: Dashboard Architect / Frontend Engineer
sprint: 5
---

# Admin Dashboard Architecture

> **Naming note:** the Sprint 5 brief asked for docs under `obsidian/07_Admin/`, `obsidian/09_Sprints/`, `obsidian/10_Logs/`. This vault's numbering was already fixed at Sprint 0 (`07 AI`, `09 Testing`, `10 Documentation` are reserved for those actual future topics) and `06 Dashboard` already existed as an empty placeholder — a perfect semantic fit for this module, so it's used here instead of creating conflicting duplicate folders. Cross-cutting decisions still go in `01 Vision/Decisions.md` (the existing ADR log), not a new "Logs" folder. Flag if you want the vault renumbered to match the new scheme literally.

## Why a separate app (`apps/admin`), not a route group in `apps/web`
Internal staff tooling and the public customer site have different audiences, different bundles, and different risk profiles (RBAC-gated data, no reason to ship that code to anonymous visitors). A fourth workspace package matches the monorepo's existing feature-based split (`apps/web`, `apps/api`, `packages/database`, `packages/contracts`) rather than mixing concerns inside one Next.js app's middleware. `apps/admin` depends on `@drivehub/contracts` only — never `@drivehub/database` — same rule as `apps/web`, so the DB boundary rule from Sprint 1 holds for a third consumer, not just two.

## Design system
Generated via the `ui-ux-pro-max` skill (query: "enterprise ERP admin dashboard car rental fleet management b2b internal tool", `--density 8`): **"Trust & Authority"** style, navy/slate palette (`#0F172A` primary, `#0369A1` accent), **Fira Code** (headings) / **Fira Sans** (body) — a real, deliberate pairing from the tool's font-pairing database for "admin panels," not an arbitrary choice. Applied as CSS custom properties in `globals.css`, both light and dark variants defined together (not an automatic invert).

Chart series colors are **not** derived from this UI palette — they use the `dataviz` skill's separately-validated categorical palette (blue/aqua/yellow/green/violet/red, fixed order, CVD-safe). A UI-chrome palette isn't validated for colorblind-safe data encoding; the two skills' outputs are combined, not blended, per each skill's own stated domain of authority.

## Shell (built once, reused by every future module)
- `components/layout/app-sidebar.tsx` — shadcn `Sidebar` primitives, collapsible-to-icon. Lists **all 9 modules** from the brief (Fleet, Booking, Sales, Customer, Employee, Finance, Reports, CMS, Settings) so the full information architecture is visible immediately — but only "Executive Dashboard" is an active link; the rest render `disabled` with a "coming soon" tooltip. This satisfies "don't skip modules" (the plan is visible) without violating "never generate placeholder code" (nothing links to a page that doesn't exist yet).
- `components/layout/site-header.tsx` — `SidebarTrigger`, breadcrumbs (pathname → title lookup), theme toggle, user menu (real session data + sign out).
- `components/layout/auth-guard.tsx` — authentication redirect only (`useSession()` → `/sign-in` if absent). Authorization (which roles see what) is enforced server-side; see `04 Backend/RBAC.md`. This split is deliberate: the Sprint 5 brief says "never duplicate backend logic," and re-implementing the permission check client-side would be exactly that.
- `components/layout/theme-toggle.tsx` — `next-themes`, class-based dark mode, respects system preference by default.

## Deliberately deferred (not built this module, and why)
- **Command palette / global search** — would need real content across multiple modules to search over; building it against one page (Executive Dashboard) would mean fake/empty results, which is placeholder behavior in spirit even if the component itself is "real" code.
- **Notification center** — no event source exists yet to populate it (no bookings, no low-stock alerts, no approval requests). Same reasoning.
- **Language switch (English/Chinese)** — needs an i18n routing/content strategy decision (App Router locale segments, translation file structure) that affects every future page; a single toggle with no translated content behind it would be cosmetic. Flagging as a real architectural decision to make explicitly before more pages exist, not an oversight.

These three are the main brief items intentionally not in this delivery — everything else (sidebar, top bar, breadcrumbs, theme switch, RBAC, KPI cards, charts) is built and verified live.

## Verified working (not just written)
`tsc --noEmit`, `eslint`, and `next build` all pass clean; `npx turbo run build typecheck lint` passes across all 5 workspace packages (`contracts`, `database`, `api`, `web`, `admin`) together. Live smoke-tested: unauthenticated → redirected to `/sign-in`; signed in as a real (non-privileged) account → real `403` surfaced in the UI; signed in as the promoted `superadmin@drivehub.example` account → real KPI/chart data rendered, sourced from the live Postgres database.
