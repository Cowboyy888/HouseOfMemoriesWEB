# deployment/

Local Docker Compose stack and supporting ops docs for self-hosting this
monorepo outside of the actual production setup.

**Production today is not this stack** — see `vault/08 Deployment/Production.md`
(Vercel for `apps/web`, Railway for `apps/api`, Neon for Postgres — chosen
explicitly over Cloudflare/Docker Compose, per ADR-011/012 in
`vault/01 Vision/Decisions.md`). This folder is for local development parity
and a possible future self-hosted alternative.

## Contents
- `architecture.md` — topology diagram and container responsibilities for
  this local/self-hosted stack.
- `../docker-compose.yml` — Postgres + nginx + all three apps, orchestrated
  locally.
- `ops-runbook.md` — health checks, rollback, backup verification.
- `security-checklist.md` — baseline hardening checklist.
- `backup.sh` — Postgres dump helper for this stack's `postgres` service.
- `nginx.conf` — reverse proxy config mounted by the `nginx` compose service.

## Running locally
```bash
../scripts/deploy.sh   # docker compose up -d --build
```
