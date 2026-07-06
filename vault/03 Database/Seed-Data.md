---
status: accepted
owner: Database Engineer
sprint: 2
---

# Seed Data Structure

`prisma/seed.ts` is a real, working script (type-checked against the generated Prisma Client, not a stub) that exercises enough of the schema end-to-end to prove the models compose correctly. It is idempotent — every write is an `upsert` on a natural unique key — so it can be re-run against the same database without creating duplicates.

## What it creates, in dependency order
1. **RBAC** — `ADMIN` and `CUSTOMER` roles, a small set of `resource:action` permissions (`booking:*`, `car:manage`, `employee:manage`, `report:view`), all admin permissions attached to the `ADMIN` role.
2. **Location** — one branch, "Downtown NYC Branch" (`NYC-DT`).
3. **Catalog** — one `Brand` (Toyota), one `CarCategory` (Sedan), one `Car` (a 2024 Camry, `listingType: BOTH` — demonstrates a vehicle simultaneously available to rent or buy).
4. **Admin user** — a `User` + `UserRole` (ADMIN) + `Employee` record (General Manager at the Downtown branch) — demonstrates the User ↔ Employee 1:1 link.
5. **Demo customer** — a `User` + `UserRole` (CUSTOMER) + `CustomerProfile` + a verified `DriverLicense` (verified by the admin employee) — demonstrates the User ↔ CustomerProfile link and the employee-verification workflow.
6. **Demo booking** — a `Booking` for the demo customer against the demo car, plus a `Payment` (deposit, `SUCCEEDED`, `STRIPE`) — demonstrates the booking → payment relationship and the customer-as-payer link.

## What it deliberately does not create
Sales transactions, maintenance records, payroll, and reviews are left out of the seed on purpose — they're better exercised by feature-specific fixtures written alongside the Sales, Operations, and HR features in later sprints, once those features' actual query patterns are known. Seeding "one of everything" now would mean rewriting fixtures the moment those sprints define real business rules (e.g. a payroll fixture is only meaningful once `SalaryRule` calculation logic exists).

## Running it
```bash
cp .env.example .env   # set a real DATABASE_URL
npx prisma migrate dev --name init
npx prisma db seed
```
