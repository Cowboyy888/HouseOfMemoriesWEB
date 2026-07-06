# Project Context (for workflow agents — read this instead of re-discovering the repo each cycle)

Generated from a live repo discovery pass (Phase 1 of harness setup). Re-run discovery and update this file if the repo's structure changes significantly — don't let this drift silently out of date.

## Stack
- TypeScript everywhere. **Next.js 15** (`apps/web` — customer site, `apps/admin` — staff dashboard) + **NestJS 11** (`apps/api` — backend).
- **npm workspaces** (`apps/*`, `packages/*`), orchestrated by **Turborepo** (`turbo.json`). Package manager pinned: `npm@11.16.0` (`package.json` → `packageManager`).
- **Prisma 7** (driver-adapter based, `@prisma/adapter-pg`) in `packages/database` — 47 models across 8 domain files under `packages/database/prisma/schema/`.
- **`packages/contracts`** — shared Zod schemas/types for API request/response shapes, imported by both frontend apps and `apps/api`. New API endpoints should add their contract here, not duplicate types.
- **Better Auth** for authentication, mounted directly on the underlying Express instance in `apps/api/src/main.ts` (not a Nest controller) — see `apps/api/src/modules/auth/auth.ts`.
- **RBAC**: `Role`/`Permission`/`RolePermission`/`UserRole` tables, enforced via `PermissionsGuard` + `@RequirePermissions("resource:action")` in NestJS (`apps/api/src/shared/auth/`). Never re-implement permission checks in a frontend.

## Conventions to match (verified by inspection, not assumed)
- **File naming:** kebab-case with role suffixes — `*.controller.ts`, `*.module.ts`, `*.use-case.ts`, `*.repository.ts`, `*.mapper.ts` (backend); plain kebab-case `.tsx` for components.
- **Backend layout (per feature module, `apps/api/src/modules/<feature>/`):** `domain/` (repository interface + DI token), `application/` (use-cases, mapper), `infrastructure/` (Prisma-backed repository implementation), `<feature>.controller.ts`, `<feature>.module.ts`. Controllers depend on use-cases, use-cases depend on the domain interface (never on Prisma directly), infrastructure implements the interface. This is the Repository Pattern applied literally, not just labeled.
- **Frontend layout (`apps/web` and `apps/admin`, both under `src/`):** `features/<name>/{api.ts, hooks.ts, components/}` + shared `components/ui/` (shadcn), `components/layout/` or `components/providers/`, `lib/`.
- **Comments:** near-zero. Spot-checked controllers had 0 comment lines. Only comment when the *why* isn't obvious from the code (a hidden constraint, a workaround, a non-obvious business rule) — never restate what the code does.
- **Validation:** Zod schemas from `packages/contracts`, not `class-validator`, on the NestJS side (`ZodValidationPipe` in `apps/api/src/shared/validation/`) — so one schema validates both the request/response wire shape and gets reused by the frontend.
- **Money fields:** Prisma `Decimal` serializes to a JSON string over the wire — contracts type these as `z.string()`, not `z.number()`; format for display at render time, don't coerce early.

## Build / dev / verify commands (all confirmed working during this repo's build)
```bash
npm run build       # turbo run build (all workspaces)
npm run dev          # turbo run dev (persistent, uncached — see turbo.json)
npm run typecheck    # turbo run typecheck
npm run lint         # turbo run lint — NOTE: apps/api has no lint script; only apps/web and apps/admin do
npx turbo run build typecheck lint   # the actual full-workspace gate used throughout this repo's history
```
Per-package: `npm run <script> --workspace=@drivehub/<name>` (package names: `@drivehub/web`, `@drivehub/admin`, `@drivehub/api`, `@drivehub/database`, `@drivehub/contracts`).

## Tests — genuinely absent
`apps/api/package.json` has `"test": "vitest run"` but **zero test files exist anywhere in this repo**. `apps/web`/`apps/admin` have no test script at all. Don't assume `npm run test` is a meaningful gate yet — if a task calls for adding tests, that's real, valuable work; if it doesn't, don't block on a test command that has nothing to run.

## Deploy — not configured
No Dockerfile, no `.github/`, no wrangler config exist despite Cloudflare Pages/Docker/GitHub Actions being named as the intended stack in the README. **Do not invent a deploy command.** Deploying is a human-only action regardless (see `workflow.md` hard stops).

## Database
Local dev Postgres (Homebrew, not Docker — none available in the original dev environment), database name `drivehub_dev`. Migrations: `packages/database/prisma/migrations/`. Schema changes are additive-first (see `vault/03 Database/Migration-Strategy.md`) — safe for a coder to run `prisma migrate dev` for local/dev-only additive changes; a **production** schema change is a human-only hard stop.

## Existing documentation system (this project's closest thing to an issue tracker)
`/vault` — an Obsidian knowledge base, not a task tracker. `vault/01 Vision/Decisions.md` is a running ADR log (append new decisions, never delete old ones). Per-module docs (e.g. `vault/06 Dashboard/Executive-Dashboard.md`) end with "Known issues" and "Next Module" sections — read the relevant one before starting related work, and update it when you finish, same as every prior sprint in this repo did.

## Git state
Repo initialized, **zero commits exist yet** on `main`. No PR template, no enforced commit convention, no hooks, no branches yet. This harness uses a **branch-per-task** model (see `workflow.md`) so a reviewer has something concrete to diff even with no PR process set up: the coder commits its own work locally to a task-scoped branch, never to `main` directly, and never pushes anywhere. Merging to `main` and pushing are human actions.
