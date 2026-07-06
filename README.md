# DriveHub (placeholder brand)

Enterprise Car Rental & Car Sales platform. Built with Harness Engineering: every decision is documented in the Obsidian vault at [`/vault`](./vault) before code is written.

## Status
Sprint 5 — Admin Dashboard shell + Executive Dashboard module (RBAC-gated, real KPIs/charts from live Postgres data) shipped on a new `apps/admin` workspace, alongside the customer site's Car Browsing and Auth slices from Sprint 4. Real Postgres database, real NestJS API, real Next.js pages — verified live, not just written. See [`/vault/04 Backend`](./vault/04%20Backend), [`/vault/05 Frontend`](./vault/05%20Frontend), [`/vault/06 Dashboard`](./vault/06%20Dashboard), and [`/vault/08 Deployment/Local-Development.md`](./vault/08%20Deployment/Local-Development.md).

## Quick Start
```bash
npm install
cd packages/database && npx prisma migrate dev --name init && npm run prisma:seed && cd ../..
cd apps/api && npm run dev &     # http://localhost:4000/api
cd apps/web && npm run dev &     # customer site, http://localhost:3000 (or next free port)
cd apps/admin && npm run dev &   # staff dashboard, http://localhost:3000 (or next free port)
```
See [`/vault/08 Deployment/Local-Development.md`](./vault/08%20Deployment/Local-Development.md) for env file setup per package and test account credentials.

## Stack
- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), TanStack React Query, Zod, React Hook Form (admin), Recharts (admin)
- **Backend:** NestJS (Clean Architecture: controller → use case → repository interface → Prisma adapter), Prisma ORM 7, PostgreSQL, Redis (planned)
- **Auth:** Better Auth — email/password working end-to-end; Google/Facebook configured in code, inert until real OAuth credentials are supplied
- **RBAC:** 11 roles, permission-guarded API routes (`@RequirePermissions`), enforced server-side only
- **Storage:** Cloudflare R2, Cloudflare Images (not yet wired up)
- **Deployment:** Cloudflare Pages, Docker, GitHub Actions (not yet configured)
- **Testing:** Vitest, Playwright (not yet configured)
- **Monorepo:** Turborepo + npm workspaces

## Repo Layout
```
/vault              — Obsidian knowledge base (vision, requirements, architecture, decisions)
/packages/database   — Prisma schema/migrations/seed, shared PrismaClient factory
/packages/contracts  — shared Zod schemas/types (API request/response contracts)
/apps/api            — NestJS backend (serves both frontends)
/apps/web            — Next.js customer-facing site
/apps/admin          — Next.js staff admin dashboard (RBAC-gated)
```

## Knowledge Base
Open `/vault` as an Obsidian vault to browse documentation. Start at `01 Vision/Vision.md`.
