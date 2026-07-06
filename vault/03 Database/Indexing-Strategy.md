---
status: accepted
owner: Performance Engineer (Database Engineer role)
sprint: 2
---

# Indexing Strategy

## What Prisma already gives us for free
Since Prisma ORM 4, a scalar field used in a `@relation` gets an implicit index automatically (unless it's already covered by `@id`/`@unique`/an explicit `@@index`). So every simple foreign key in this schema (`Car.brandId`, `Booking.customerId`, `Payment.bookingId`, etc.) is indexed without us writing anything. The explicit `@@index`/`@@unique` attributes in the schema exist for two reasons only: **composite** indexes (multiple columns queried together) and **uniqueness** constraints.

## Composite indexes added, by query they serve
| Model | Index | Serves |
|---|---|---|
| `Car` | `[status, listingType]` | Catalog search: "available cars for rent/sale" |
| `Car` | `[brandId]`, `[categoryId]`, `[currentLocationId]` | Catalog filters |
| `Booking` | `[carId, startDate, endDate]` | Availability/overlap check for a specific car |
| `Booking` | `[customerId, status]` | "My bookings" customer portal view |
| `Booking` | `[status, startDate]` | Ops dashboards ("upcoming pickups", "active rentals") |
| `AvailabilityBlock` | `[carId, startDate, endDate]` | Range-overlap lookups when creating a new booking |
| `PricingRule` | `[carId, isActive]`, `[categoryId, isActive]` | Resolving the active price for a car at booking time |
| `Payment` | `[status, createdAt]` | Finance dashboards, reconciliation jobs |
| `Invoice` | `[customerId, status]` | Customer portal invoice list |
| `RevenueLedgerEntry` | `[sourceType, occurredAt]`, `[locationId, occurredAt]` | Revenue reports by source/branch/date range |
| `Attendance` | `[date, status]` | HR attendance-by-day reporting |
| `PaymentSchedule` | `[status, dueDate]` | Installment collections job ("what's due/late today") |
| `DriverLicense` | `[verificationStatus]` | Admin verification queue |
| `Review` | `[carId, status]` | Public car detail page reviews |

## Uniqueness constraints (also indexes)
`Car.vin`, `Car.licensePlate`, `Brand.slug`, `CarCategory.slug`, `Location.code`, `Booking.bookingNumber`, `SaleTransaction.saleNumber`, `SalesContract.contractNumber`, `Invoice.invoiceNumber`, `Employee.employeeCode`, `User.email`, `Session.token`, `Account.[providerId, accountId]`, `Permission.[resource, action]`, `DriverLicense.[licenseNumber, issuingState, issuingCountry]`, `Payroll.[employeeId, payPeriodStart, payPeriodEnd]`, `Attendance.[employeeId, date]`, `PaymentSchedule.[installmentPlanId, installmentNumber]`.

## What Prisma can't express — raw SQL follow-ups (documented here, applied in a migration, see `Migration-Strategy.md`)

**1. Prevent overlapping bookings at the database level.** Application code should already refuse to double-book a car, but the DB should refuse it too — race conditions between two concurrent booking requests are exactly the case where "the app checked first" fails. Add a `daterange` column (generated from `startDate`/`endDate`) and a `GiST` exclusion constraint:
```sql
ALTER TABLE bookings ADD COLUMN date_range daterange
  GENERATED ALWAYS AS (daterange("startDate"::date, "endDate"::date, '[]')) STORED;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist ("carId" WITH =, date_range WITH &&)
  WHERE (status IN ('PENDING', 'CONFIRMED', 'ACTIVE'));
```

**2. Partial indexes for the soft-delete hot path.** Every "list active X" query filters `WHERE "deletedAt" IS NULL`. A partial index is smaller and faster than indexing all rows:
```sql
CREATE INDEX cars_active_idx ON cars ("status", "listingType") WHERE "deletedAt" IS NULL;
```
Apply the same pattern to `employees`, `customer_profiles`, `locations` once real query patterns from the Backend sprint confirm which filters are actually hot.

**3. Enforce "exactly one parent" on `Payment`/`Invoice`/`Review`/`RevenueLedgerEntry`.**
```sql
ALTER TABLE payments ADD CONSTRAINT payment_exactly_one_parent CHECK (
  (("bookingId" IS NOT NULL)::int + ("saleTransactionId" IS NOT NULL)::int + ("paymentScheduleId" IS NOT NULL)::int) = 1
);
```
Same shape for `invoices` (booking/sale — zero or one, since a standalone invoice with neither is valid, e.g. a fee) and `reviews` (car/booking/sale — at least one).

## Read-scaling notes (beyond indexes)
- **Redis** (already in the stack) caches car search results and availability lookups — the highest-QPS, most-repeated reads on the platform.
- **Postgres read replica** for reporting/analytics queries (Reports & Analytics module) so heavy aggregate queries don't contend with transactional booking/payment writes. Wire this up as a second Prisma datasource or a read/write-splitting middleware once traffic patterns justify it — not needed at MVP scale.
- **Denormalized counters reconciled by ledgers** — `CustomerProfile.loyaltyPoints` and `Payroll.grossPay/netPay` are intentionally-cached aggregates; the source of truth is the corresponding ledger/line-item table, so a cache bug never causes permanent data loss, only a recomputable drift.
- A `pg_trgm` GIN index on `Car.model`/`Brand.name` is a good future addition for fuzzy search-as-you-type, deferred until the Frontend catalog search feature defines its actual query shape.
