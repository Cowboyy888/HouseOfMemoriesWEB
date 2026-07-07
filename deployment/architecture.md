# Local / Self-Hosted Deployment Architecture

This is the **local development and potential future self-hosted** topology
that this folder's `docker-compose.yml`, Dockerfiles, and `nginx.conf`
implement — it is not what's running in production today.

**For what's actually live in production**, see `vault/08 Deployment/Production.md`:
`apps/web` on Vercel, `apps/api` on Railway (via `apps/api/Dockerfile`), Postgres
on Neon — chosen explicitly instead of this Cloudflare/Docker-Compose topology,
per ADR-011/012 in `vault/01 Vision/Decisions.md`.

## Topology (docker-compose.yml)
```text
docker-compose.yml
  nginx (deployment/nginx.conf, host port 8080)
    -> web (Next.js, port 3000)
    -> api (NestJS, port 4000, under /api/)
  admin (Next.js, host port 3002 — not fronted by nginx)
  postgres (port 5432)
```

## Responsibilities
- `web` and `admin` serve the customer and admin UI.
- `api` handles business logic and persistence.
- `postgres` stores transactional data.
- `nginx` fronts `web`/`api` behind one origin for local orchestration; `admin`
  is reached directly on its own port (not proxied).

## Container strategy
- `web`: Next.js production build (`apps/web/Dockerfile`)
- `admin`: Next.js production build (`apps/admin/Dockerfile`)
- `api`: NestJS production build (`apps/api/Dockerfile` — the same image
  Railway runs in production)
- `postgres`: PostgreSQL service
