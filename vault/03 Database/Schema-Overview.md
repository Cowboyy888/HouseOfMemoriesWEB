---
status: accepted
owner: Database Engineer / Software Architect
sprint: 2
---

# Schema Overview

47 models across 8 domain files under `/prisma/schema/`, merged by Prisma's multi-file schema support (stable, Prisma ORM 6.7+; this repo runs Prisma 7). Schema is **validated and Client-generated** — see the bottom of this doc for how to reproduce that.

| File | Domain | Models |
|---|---|---|
| `identity.prisma` | Identity & Access | User, Session, Account, Verification, Role, Permission, RolePermission, UserRole, AuthenticationLog |
| `fleet.prisma` | Business Core — Fleet & Catalog | Brand, CarCategory, Location, Car, CarImage, CarFeature, CarFeatureAssignment, PricingRule, AvailabilityBlock |
| `rental.prisma` | Rental System | Booking, BookingExtension, ReturnReport, DamageReport, DamageReportImage |
| `sales.prisma` | Sales System | SaleTransaction, InstallmentPlan, PaymentSchedule, SalesContract |
| `finance.prisma` | Finance | Payment, Invoice, InvoiceLineItem, Refund, RevenueLedgerEntry |
| `operations.prisma` | Operations | Vendor, MaintenanceRecord, ServiceSchedule, InspectionReport, InspectionChecklistItem |
| `hr.prisma` | HR Module | Employee, Department, Attendance, Payroll, SalaryRule, PayrollLineItem |
| `customer.prisma` | Customer System | CustomerProfile, DriverLicense, Review, LoyaltyTransaction |

## Cross-Cutting Design Decisions

**UUID primary keys everywhere** — `id String @id @default(uuid())` on every model, per the tech requirement. Better Auth's own tables (`User`, `Session`, `Account`, `Verification`) get the same treatment; Better Auth sets IDs explicitly through its adapter, so the DB-level default rarely fires but keeps the column typed and non-null either way.

**Timestamps** — every mutable model carries `createdAt` (`@default(now())`) and `updatedAt` (`@updatedAt`); append-only ledgers (`AuthenticationLog`, `LoyaltyTransaction`, `RevenueLedgerEntry`) only carry `createdAt`/`occurredAt` since they're never updated in place.

**Soft delete** — applied only to master/reference data whose removal must not break historical FK references: `User`, `Role`, `Brand`, `CarCategory`, `Location`, `Car`, `CarFeature`, `Vendor`, `Employee`, `Department`, `CustomerProfile`. Transactional/event records (`Booking`, `Payment`, `Invoice`, `Payroll`, `Attendance`, `MaintenanceRecord`, `Review`, ledgers, audit logs) are **never** soft-deleted — their lifecycle is modeled with a `status` enum instead, and financial/audit rows should never disappear, logically or physically.

**Shared fleet inventory (ADR-002)** — one `Car` model serves both Rental and Sales via `listingType` (`RENTAL` / `SALE` / `BOTH`) and `status`. `Booking` and `SaleTransaction` both point at the same `Car` row.

**"Polymorphic" associations modeled as nullable FKs, not string+id pairs** — `Payment`, `Invoice`, `Review`, and `RevenueLedgerEntry` each need to attach to one of several parent types (a booking, a sale, an installment). Rather than a loose `payableType/payableId` pair (which Prisma can't validate and Postgres can't foreign-key), each possible parent gets its own nullable FK column. This keeps referential integrity enforced by the database. The trade-off — "exactly one of these must be set" isn't expressible in Prisma — is closed with a raw-SQL `CHECK` constraint (see `Migration-Strategy.md`).

**Availability as ranges, not calendar rows** — `AvailabilityBlock` stores date ranges per car (a handful of rows/year), not one row per car per day (which would be ~365 rows/car/year and dominate write volume at fleet scale). See `Indexing-Strategy.md` for the query pattern and the recommended Postgres exclusion constraint that prevents overlapping blocks at the DB level.

**Append-only ledgers for money and points** — `RevenueLedgerEntry` and `LoyaltyTransaction` are insert-only. Reports and `CustomerProfile.loyaltyPoints` are derived from/cached against them, so a report that already ran never has its inputs mutated retroactively.

**Better Auth compatibility** — `User`/`Session`/`Account`/`Verification` field names and shapes match what the Better Auth Prisma adapter expects. All of our RBAC and domain extensions (`Role`, `CustomerProfile`, `Employee`, etc.) hang off `User` via relations only — no extra scalar columns were added to `User` itself, so Better Auth's own queries are unaffected.

## Reproducing Validation
```bash
npm install
cp .env.example .env   # fill in a real DATABASE_URL
npx prisma validate
npx prisma format
npx prisma generate
```
All three were run against this schema during Sprint 2 and passed (Prisma 7.8.0). `prisma/seed.ts` was additionally type-checked against the generated client with `tsc --noEmit` — every field/relation/enum name it uses matches the schema.
