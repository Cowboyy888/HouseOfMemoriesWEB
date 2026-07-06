---
status: accepted
owner: Database Engineer / DevOps Engineer
sprint: 2
---

# Migration Strategy

## Tooling
`prisma migrate dev` locally (generates + applies a migration, keeps `prisma/migrations/` in sync with the schema folder). `prisma migrate deploy` in CI/CD (GitHub Actions) applies pending migrations to staging/production — it never generates new migrations, only applies committed ones, so production schema changes are always reviewed as a diff in a PR first.

Connection config for the CLI lives in `prisma.config.ts` (Prisma 7 requirement — `datasource.url` in the schema file itself is no longer supported); the running application connects via a driver adapter (`@prisma/adapter-pg`) passed to `PrismaClient`, not via a schema-level URL.

## First migration
Once a real `DATABASE_URL` is available (DevOps sprint provisions Postgres):
```bash
npx prisma migrate dev --name init
```
This creates `prisma/migrations/<timestamp>_init/migration.sql` from the current schema (all 47 models) and applies it to the dev database.

## Required raw-SQL follow-up migration
Three things in `Indexing-Strategy.md` and `Schema-Overview.md` can't be expressed in the Prisma schema language and must be added as a second, hand-written migration immediately after `init`:
```bash
npx prisma migrate dev --name raw_sql_constraints --create-only
# then hand-edit the generated empty migration.sql to add:
#   1. btree_gist extension + generated date_range column + EXCLUDE constraint on bookings
#   2. CHECK constraint on payments (exactly one of booking/sale/paymentSchedule)
#   3. CHECK constraints on invoices and reviews (see Indexing-Strategy.md for exact SQL)
#   4. partial indexes for the deletedAt IS NULL hot path
npx prisma migrate dev
```
Using `--create-only` lets us write raw SQL Prisma can't generate itself, while still tracking it as a normal, reviewable migration file that `migrate deploy` will apply in order.

## Migration review rules (Harness Engineering — Code Reviewer + DBA sign-off)
- Every migration PR must include the generated `migration.sql` — never hand-apply schema changes directly to a shared database.
- Additive-first for zero-downtime deploys: add new nullable columns/tables in one deploy, backfill, then add `NOT NULL`/drop old columns in a later deploy — never combine "add column" and "make it required" in a migration that runs against a database serving live traffic.
- Destructive migrations (`DROP COLUMN`, `DROP TABLE`, narrowing a column type) require explicit sign-off noted in the PR description, and a verified-recent backup before `migrate deploy` runs in production.
- `prisma migrate deploy` is the only command allowed to touch staging/production databases; it runs in the GitHub Actions deploy pipeline under a dedicated, more-privileged DB credential than the one the running app uses (see `Security-Considerations.md`).

## Seeding
`npx prisma db seed` (wired to `prisma/seed.ts` via `prisma.config.ts`'s `migrations.seed`) is safe to run repeatedly — every write is an `upsert` keyed on a natural unique field (email, VIN, booking number, etc.), so re-running it never creates duplicates. It's intended for local/dev/staging only, never production.
