---
status: accepted
owner: Software Architect / Backend Engineer
sprint: 4
---

# Backend Architecture (NestJS)

`apps/api` is a NestJS app. Every feature module follows the same Clean Architecture layering, using the Cars module (`src/modules/cars/`) as the reference implementation:

```
modules/cars/
  cars.module.ts          — DI wiring
  cars.controller.ts      — HTTP boundary: parses/validates input, calls a use case, returns a DTO
  application/
    list-cars.use-case.ts     — one class per use case (single public method: execute)
    get-car-by-id.use-case.ts
    car.mapper.ts              — Prisma entity -> @drivehub/contracts DTO (persistence shape never leaks to the API boundary)
  domain/
    car.repository.ts     — the port: CarRepository interface + CAR_REPOSITORY DI token. Use cases depend on this, never on Prisma directly.
  infrastructure/
    prisma-car.repository.ts  — the adapter: implements CarRepository using PrismaService
```

**Dependency direction:** `controller → use case → repository interface (domain) ← repository implementation (infrastructure)`. The application layer never imports Prisma types directly except through the domain layer's re-exports — swapping persistence (e.g., adding a cache-backed repository, or a read-replica-routed one) means writing a new `infrastructure/` adapter and rebinding the DI token in the module, with zero changes to controllers or use cases. This is the Repository Pattern requirement from the master prompt, applied concretely rather than as a label.

## Validation
Query/body validation uses **Zod schemas from `@drivehub/contracts`**, not NestJS's usual `class-validator`. Rationale: the same schema (`CarListQuerySchema`, etc.) is imported by `apps/web` to validate API responses on the way in — one schema, enforced on both sides of the wire, instead of two hand-maintained DTOs that can drift. `ZodValidationPipe` (`src/shared/validation/zod-validation.pipe.ts`) adapts a Zod schema to Nest's `PipeTransform` interface; invalid input throws a `BadRequestException` with Zod's field-level error detail (verified: `GET /api/cars?page=0` → `400` with `{"fieldErrors":{"page":[...]}}`).

## Database access
`PrismaService` (`src/shared/database/prisma.service.ts`) wraps the `createPrismaClient()` factory from `@drivehub/database`, connecting/disconnecting on Nest's module lifecycle hooks. It's provided by a `@Global()` `DatabaseModule` so every feature module can inject it without re-importing it.

## Verified working (not just written)
- `npx prisma migrate dev --name init` applied against a real local Postgres 16 instance (`drivehub_dev`).
- `npm run prisma:seed` populated real rows (2 users, 1 role set, 1 car, 1 booking, 1 payment).
- `nest build` compiles cleanly; the built server (`node dist/main.js`) starts and serves real requests.
- `GET /api/cars`, `GET /api/cars?listingType=RENTAL|SALE|BOTH`, `GET /api/cars?minPrice=...`, `GET /api/cars/:id`, a 404 for an unknown id, and a 400 for invalid query params were all exercised against the live server and returned correct results — including a real bug found and fixed during this: `listingType=RENTAL`/`SALE` now correctly include cars with `listingType: BOTH` (an exact-match filter was wrong; see `prisma-car.repository.ts`).

## Known gaps (explicitly out of scope this sprint)
- No auth/guards yet on the Cars endpoints (they're public read endpoints, which is correct for a catalog — auth matters starting with the Booking/Sales/Admin features).
- `npm audit` reports 11–13 vulnerabilities, all in dev-time transitive dependencies (esbuild's dev server, Prisma's internal dev-CLI tooling, `multer` pulled in transitively by `@nestjs/platform-express` though file upload isn't used yet). None are runtime application vulnerabilities; worth a dedicated dependency-hygiene pass before production deployment, not before the next feature.
