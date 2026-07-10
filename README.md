# DriveHub (placeholder brand)

Enterprise Car Rental & Car Sales platform. Built with Harness Engineering: every decision is documented in the Obsidian vault at [`/vault`](./vault) before code is written.

## Status
**Live in production:** customer site + API, at https://web-ochre-five-54.vercel.app (Vercel) backed by https://api-production-58ef.up.railway.app (Railway) and a Neon Postgres database. `apps/admin` is built (Sprint 5 — RBAC-gated Executive Dashboard) but not yet deployed. See [`/vault/08 Deployment/Production.md`](./vault/08%20Deployment/Production.md) for the full deployment writeup, [`/vault/04 Backend`](./vault/04%20Backend), [`/vault/05 Frontend`](./vault/05%20Frontend), [`/vault/06 Dashboard`](./vault/06%20Dashboard), and [`/vault/08 Deployment/Local-Development.md`](./vault/08%20Deployment/Local-Development.md) for local dev.

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
- **Deployment:** Vercel (`apps/web`), Railway via Docker (`apps/api`), Neon (Postgres) — see `vault/08 Deployment/Production.md` for why this differs from the originally-planned Cloudflare Pages/Containers. No CI/CD yet (deploys are manual)
- **Testing:** Vitest (`apps/api` unit tests), Playwright (`e2e/` — `npm run test:e2e`, see `/vault/09 Testing/Testing-Strategy.md`)
- **Monorepo:** Turborepo + npm workspaces

## Repo Layout
```
/vault              — Obsidian knowledge base (vision, requirements, architecture, decisions)
/packages/database   — Prisma schema/migrations/seed, shared PrismaClient factory
/packages/contracts  — shared Zod schemas/types (API request/response contracts)
/apps/api            — NestJS backend (serves both frontends)
/apps/web            — Next.js customer-facing site
/apps/admin          — Next.js staff admin dashboard (RBAC-gated)
/e2e                 — Playwright E2E tests driving apps/api + apps/web + apps/admin together
```

## Knowledge Base
Open `/vault` as an Obsidian vault to browse documentation. Start at `01 Vision/Vision.md`.
