---
status: accepted
owner: Frontend Engineer / UI-UX Designer
sprint: 4
---

# Frontend Architecture (Next.js 15 App Router)

Pinned to **Next.js 15** (15.5.20), not the newer major the scaffolder defaults to — the master prompt specifies 15 explicitly. `create-next-app@latest` currently installs Next 16; re-scaffolded with `create-next-app@15` instead. Worth knowing if this app is ever re-scaffolded or a dependency bump is considered.

## Folder structure (feature-based, matches the Backend's module boundaries)
```
src/
  app/                      — routes only (Server Components by default)
    layout.tsx              — root layout: fonts, site-wide metadata, wraps <QueryProvider>
    page.tsx                — home
    cars/
      page.tsx              — listing/search (Server Component: parses searchParams, prefetches + hydrates React Query)
      [id]/page.tsx          — detail (Server Component: generateMetadata + notFound() for missing cars)
  features/
    cars/
      api.ts                — fetch functions, Zod-validated responses (fetchCars, fetchCarById)
      hooks.ts               — "use client" React Query hooks (useCarsQuery, useCarQuery) for client-side refetching
      search-params.ts       — URL searchParams -> CarListQuery parsing, shared by the page and (future) client nav
      components/            — car-card, car-grid, car-filters, car-gallery
  components/
    ui/                      — shadcn/ui primitives (button, card, badge, input, select, skeleton)
    providers/query-provider.tsx — client-only QueryClientProvider wrapper
  lib/
    env.ts                  — typed access to NEXT_PUBLIC_API_URL
    format.ts                — currency formatting (API sends Prisma Decimal fields as strings; formatted at render time)
```
Booking/Sales/Admin features will each get their own `features/<name>/` folder the same way — no shared "utils" grab-bag.

## SSR + React Query hydration (the SEO/perf requirement, concretely)
Both `/cars` and `/cars/[id]` are **Server Components that fetch on the server first** — the initial HTML response contains real car data (verified: `curl`'d HTML includes the car's name, price, and correct `<title>`/`og:title` tags), not a client-side loading spinner. `/cars` additionally prefetches into a `QueryClient` and passes it to a `HydrationBoundary`, so the `"use client"` `CarGrid` picks up that data instantly on mount and only re-fetches when the user changes filters (`useCarsQuery` in `features/cars/hooks.ts`). This gets both: crawlable, fast first paint, and smooth client-side interaction afterward — not a tradeoff between the two.

`generateMetadata` on the detail page builds a per-car `<title>` and Open Graph tags from real fetched data (verified live: a Camry's page renders `<title>Toyota Camry (2024) | DriveHub</title>`).

## Shared contract with the backend
`@drivehub/contracts` (Zod schemas) is imported directly — `features/cars/api.ts` runs `CarListResponseSchema.parse(...)` / `CarDetailSchema.parse(...)` on every API response before it reaches a component. If the backend's shape ever drifts from what the frontend expects, this throws immediately with a clear Zod error instead of silently rendering `undefined`. Same schema package the NestJS controller validates its output against — one source of truth, not two DTOs kept in sync by hand.

## A real bug found and fixed while building this
`create-next-app@latest` installed Next 16 (not the specified 15) — corrected. Then, wrapping the app in `QueryProvider` broke the production build's automatic 404/error page prerender (`Cannot read properties of null (reading 'useContext')`) because **two different React copies** ended up in the dependency tree — root hoisted `19.2.7`, `apps/web` nested its own `19.1.0` because its `package.json` pinned an exact version. Fixed by relaxing the pin to `^19.1.0` and forcing a clean reinstall so npm could dedupe to one shared copy. Documented here because it's the kind of bug that resurfaces silently if a future exact-version pin gets added to any workspace package.

## Verified working (not just written)
- `tsc --noEmit`, `eslint` (zero warnings), and `next build` (webpack and Turbopack) all pass clean.
- `npx turbo run build` at the repo root correctly builds `@drivehub/contracts` before `@drivehub/api`/`@drivehub/web` (dependency-graph ordering working as intended per ADR-003).
- Live dev server (`next dev --turbopack`) serves `/`, `/cars`, and `/cars/[id]` against the real running NestJS API — all `200`, with real seeded data, real 404 for an unknown id.

## Known gaps (explicitly out of scope this sprint)
- ~~No Booking/Buy call-to-action on the detail page yet~~ — done in Sprint 6 Module 8, see `05 Frontend/Booking-Payments-UI.md` (rental booking; sale/purchase checkout is still a later phase).
- No auth/session UI yet (Better Auth integration comes with the Auth feature, not this one).
- Cloudflare Images/R2 domain isn't configured in `next.config.ts` yet — no real image URLs exist to test against until the fleet has real photos.

## Homepage AI widgets (Sprint 7 Module 1)
`features/ai/{api.ts, hooks.ts, components/}` follows the same feature-folder shape as `features/cars/` — `AiAssistant` (a chat widget over `POST /api/ai/chat`, `useChatMutation`) and `AiRecommendations` (`GET /api/ai/recommendations`, `useRecommendationsQuery`), both rendered on the homepage (`app/page.tsx`). Responses are Zod-parsed (`ChatResponseSchema`, `RecommendationResultSchema` from `@drivehub/contracts`) the same way `features/cars/api.ts` validates catalog responses. See `vault/07 AI/Customer-Assistant.md` for the backend these call.
