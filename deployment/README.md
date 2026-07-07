# Deployment Architecture

## Overview

This repository is structured as a Turborepo monorepo with:
- apps/web: public-facing Next.js frontend
- apps/admin: admin Next.js frontend
- apps/api: NestJS backend API
- packages/database: Prisma schema and migrations

The production deployment architecture uses:
- Docker containers for each app
- Docker Compose for local orchestration and future staging environments
- GitHub Actions for CI/CD
- Cloudflare for edge delivery, R2 storage, and image hosting
- PostgreSQL for transactional data
- Redis for caching and queues

## Proposed topology

- Internet -> Cloudflare CDN / reverse proxy
- Cloudflare -> app containers or hosted services
- App containers -> PostgreSQL + Redis
- Static assets and uploaded media -> Cloudflare R2
- Logs and metrics -> centralized observability stack

## Container strategy

- web: Next.js production build
- admin: Next.js production build
- api: NestJS production build
- database: PostgreSQL service
- redis: Redis service

## Next steps

- Add Dockerfiles for each service
- Add compose configuration
- Add CI workflows
- Add deployment scripts and health checks
