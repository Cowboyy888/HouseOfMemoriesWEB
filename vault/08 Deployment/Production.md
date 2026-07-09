---
status: accepted
owner: DevOps Engineer
sprint: 6
---

# Production Deployment

Live as of 2026-07-06. Scope: **customer site only** (`apps/web` + `apps/api` + database) — `apps/admin` is deliberately not deployed yet (its RBAC role-grants are still a manual SQL step; not something to expose publicly before Settings → Roles is built).

## Why this topology, not the originally-named stack
The README originally named Cloudflare Pages + Docker + GitHub Actions. Two of those needed correcting against **current** platform reality (checked live, not from training memory — see `01 Vision/Decisions.md` ADR-011/012):
- Cloudflare deprecated Next.js support on **Pages** (`@cloudflare/next-on-pages`, incompatible with Next.js 15+). Its replacement (`@opennextjs/cloudflare`) targets **Workers**, not Pages.
- Cloudflare **Containers** (the Docker-on-Cloudflare option) is still beta — no SLA, unusual Durable-Object-based routing model, real adaptation work for a plain NestJS app.

Chosen instead, per your explicit picks:
| Piece | Platform | Why |
|---|---|---|
| `apps/web` (Next.js 15) | **Vercel** | Built by the Next.js team, zero-adapter, simplest path |
| `apps/api` (NestJS) | **Railway** | Runs a plain Dockerfile directly, mature, no beta caveats |
| Postgres | **Neon** | Serverless, generous free tier, provider-agnostic |

## Live endpoints
- API: `https://api-production-58ef.up.railway.app/api` (Railway project `drivehub-api`, service `api`)
- Web: `https://web-ochre-five-54.vercel.app` (Vercel project `web`)
- Database: Neon project `drivehub-production` (org `zysteel` — the only org on this account; each Neon project is still an isolated Postgres instance regardless of org)

## What was actually built to make this possible
- **`apps/api/Dockerfile`** (new — the stack never had one) — multi-stage build; builds `@drivehub/contracts` → `@drivehub/database` (incl. `prisma generate`) → `@drivehub/api` from full monorepo context, since `apps/api` depends on both workspace packages. `.dockerignore` added alongside it.
- **`apps/api/src/shared/config/allowed-origins.ts`** — `getAllowedOrigins()` reads a comma-separated `WEB_ORIGINS` env var, used by both CORS (`main.ts`) and Better Auth's `trustedOrigins` (`auth.ts`), now serving **two** frontend origins (dev + prod) without the two ever drifting apart.
- Vercel project's **Root Directory** set to `apps/web` via the API (`vercel api /v9/projects/... -F rootDirectory=apps/web`) — the CLI has no direct command for this. Required because linking/deploying from inside `apps/web` directly (the first attempt) only uploaded that subdirectory and broke on the sibling `@drivehub/contracts` workspace package; the fix links the **whole repo** and lets Vercel `cd` into `apps/web` post-install.

## Environment variables (values never printed — see each platform's own dashboard)
- **Railway (`api` service):** `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (fresh production value, distinct from dev's), `PORT=4000`, `BETTER_AUTH_URL` (Railway domain), `WEB_ORIGINS` (Vercel domain)
- **Vercel (`web` project, production):** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_ORIGIN` (both point at the Railway domain)
- **Local-only, gitignored:** `packages/database/.env.production` — used once to run `prisma migrate deploy` + seed against Neon; not read by any deployed service (Railway has its own copy of `DATABASE_URL`)

## Verified live (real HTTP calls against the real deployed stack, not local)
- `prisma migrate deploy` applied all 47 tables to the fresh Neon database; baseline demo catalog seeded (same idempotent `seed.ts` as dev — **clearly fake data** (a Toyota Camry, a demo customer): replace with real inventory before real customers arrive).
- Railway API: real request to `/api/cars` returns real seeded data from Neon.
- Vercel frontend: `/cars` page SSR-renders that same real data (full chain: browser → Vercel → Railway → Neon).
- CORS preflight + real sign-up (`POST /api/auth/sign-up/email`) succeeded end-to-end from the actual production Vercel origin against the actual production Railway API, with the auto-provisioning hook confirmed (verified, then the test account was deleted).

## Known gaps
- No custom domain — both services are on their platform-provided subdomains.
- No CD — deploys are still run manually via `railway up` / `vercel --prod` from local; pushing to `main` does **not** auto-deploy either service. CI now exists (`.github/workflows/ci.yml`: lint/typecheck/test on push/PR to `main`), and `.github/workflows/deploy.yml` runs `npm run build` on push to `main` but its actual deploy step is still a placeholder (`echo "Deployment hook goes here"`) — deploying remains a human-only action regardless (see `workflow.md` hard stops).
- `apps/admin` is not deployed anywhere.
- No error/log monitoring (Sentry, drains, etc.) configured on either platform.
- Seed data on production is demo/placeholder-obvious data, not real inventory.
