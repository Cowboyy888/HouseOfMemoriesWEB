# Deployment Architecture Diagram

```text
Internet
  -> Cloudflare CDN / Reverse Proxy
    -> web (Next.js)
    -> admin (Next.js)
    -> api (NestJS)
       -> PostgreSQL
       -> Redis
       -> Cloudflare R2 (uploads/media)
```

## Responsibilities
- Web and admin serve the customer and admin UI.
- API handles business logic and persistence.
- PostgreSQL stores transactional data.
- Redis caches session and application state.
- Cloudflare R2 stores object storage backups and media.
