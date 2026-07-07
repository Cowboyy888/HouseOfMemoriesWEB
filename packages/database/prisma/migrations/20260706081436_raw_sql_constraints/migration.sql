-- Raw-SQL follow-up documented in vault/03 Database/Indexing-Strategy.md and
-- Migration-Strategy.md since Sprint 2 — deferred until a real write path
-- (Booking Workflow) existed to justify applying it. Four things Prisma's
-- schema language can't express:

-- 1. Prevent overlapping active bookings for the same car at the DB level.
-- Application code (CreateBookingUseCase) already checks this, but two
-- concurrent requests racing each other is exactly the case where an
-- app-level check alone fails — the DB must refuse it too.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings" ADD COLUMN "date_range" daterange
  GENERATED ALWAYS AS (daterange("startDate"::date, "endDate"::date, '[]')) STORED;

ALTER TABLE "bookings" ADD CONSTRAINT "no_overlapping_bookings"
  EXCLUDE USING gist ("carId" WITH =, "date_range" WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'ACTIVE'));

-- 2. Payment must reference exactly one payable.
ALTER TABLE "payments" ADD CONSTRAINT "payment_exactly_one_parent" CHECK (
  (("bookingId" IS NOT NULL)::int + ("saleTransactionId" IS NOT NULL)::int + ("paymentScheduleId" IS NOT NULL)::int) = 1
);

-- 3. Invoice references at most one payable (a standalone fee invoice needs neither).
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_at_most_one_parent" CHECK (
  (("bookingId" IS NOT NULL)::int + ("saleTransactionId" IS NOT NULL)::int) <= 1
);

-- 4. Review references at least one of car/booking/sale.
ALTER TABLE "reviews" ADD CONSTRAINT "review_at_least_one_parent" CHECK (
  (("carId" IS NOT NULL)::int + ("bookingId" IS NOT NULL)::int + ("saleTransactionId" IS NOT NULL)::int) >= 1
);

-- 5. Partial index for the soft-delete hot path on cars — the one table
-- Indexing-Strategy.md gives an exact column list for. It explicitly defers
-- the same pattern on employees/customer_profiles/locations "once real
-- query patterns... confirm which filters are actually hot" — not done
-- here since no such pattern exists yet and guessing the filter columns
-- would be exactly the kind of unjustified index this note warns against.
CREATE INDEX "cars_active_idx" ON "cars" ("status", "listingType") WHERE "deletedAt" IS NULL;
