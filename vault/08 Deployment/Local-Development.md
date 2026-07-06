---
status: accepted
owner: DevOps Engineer
sprint: 4
---

# Local Development Setup

## Prerequisites
- Node.js (this machine: v26.3.1), npm (v11.16.0 — pinned in root `package.json`'s `packageManager` field for Turborepo)
- PostgreSQL 16 running locally. On this machine it's via Homebrew (`brew services list` shows `postgresql@16` started); no Docker available in this environment, so no `docker-compose.yml` was added — if the team standardizes on Docker later, wrap the same Postgres/Redis setup in one.
- A local dev database exists: `drivehub_dev` (created with `createdb drivehub_dev`).

## First-time setup
```bash
npm install                                        # installs all workspaces
npm run db:migrate --workspace=@drivehub/database   # or: cd packages/database && npx prisma migrate dev
npm run db:seed --workspace=@drivehub/database
```

## Running everything
```bash
# Terminal 1 — API (NestJS), http://localhost:4000/api
cd apps/api && npm run dev

# Terminal 2 — Web (Next.js, customer site), http://localhost:3000 (or next available port)
cd apps/web && npm run dev

# Terminal 3 — Admin (Next.js, staff dashboard), http://localhost:3000 (or next available port)
cd apps/admin && npm run dev
```
Or via Turborepo from the root: `npm run dev` (runs all `dev` tasks in parallel; note `dev` tasks are `persistent`/uncached in `turbo.json` by design). Running `web` and `admin` at the same time can race for the same "next free port" — if one fails with `EADDRINUSE`, just restart it; it'll pick the next one.

**CORS note:** `apps/api/.env`'s `WEB_ORIGINS` (plural, comma-separated) must list whatever ports `next dev` actually binds to for **both** `apps/web` and `apps/admin` (each logs its port on startup; port 3000 is already occupied by an unrelated process on this machine, so both apps land on higher ports that shift on every restart). A mismatched origin gets a real `403` from Better Auth's CSRF check, not a silent failure — restart the API after updating this. `getAllowedOrigins()` (`apps/api/src/shared/config/allowed-origins.ts`) is the one place both CORS and Better Auth's `trustedOrigins` read this from, so they can't drift apart.

## Environment files
Each app/package that needs one has its own `.env`/`.env.example` (not one shared root `.env`):
- `packages/database/.env` — `DATABASE_URL`
- `apps/api/.env` — `DATABASE_URL`, `PORT`, `WEB_ORIGINS` (comma-separated, one per frontend app), `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`), `BETTER_AUTH_URL`, optional `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_ORIGIN`
- `apps/admin/.env.local` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_ORIGIN`

All `.env*` except `.env.example` are git-ignored (see root `.gitignore`).

## Monorepo layout
```
apps/web            — Next.js 15 (customer-facing site)
apps/admin          — Next.js 15 (staff admin dashboard, RBAC-gated)
apps/api            — NestJS (backend API, serves both frontends)
packages/database   — Prisma schema/migrations/seed + createPrismaClient() factory (Prisma 7, driver-adapter based)
packages/contracts  — shared Zod schemas/types for API request+response shapes
```
Turborepo (`turbo.json`) orchestrates build order via each package's `dependencies` in `package.json` — `@drivehub/contracts` and `@drivehub/database` build before the apps that depend on them, automatically.

## Test accounts (seeded/created in this dev database)
- `admin@drivehub.example` — seeded directly via `prisma.user.upsert`, **no password** (can't sign in via email/password; exists for Employee/CustomerProfile linkage in seed data only).
- `jane.doe@example.com` — same as above, no password.
- `superadmin@drivehub.example` / created via real sign-up, password `correct-horse-battery`, promoted to `SUPER_ADMIN` via direct SQL — use this to sign into `apps/admin`.
