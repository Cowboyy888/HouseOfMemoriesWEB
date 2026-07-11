---
status: accepted
owner: Product Manager / Backend Integration Engineer
sprint: 5
---

# Module: Executive Dashboard

## API
`GET /api/dashboard/executive-summary` — NestJS Clean Architecture layering matching the Cars module (`controller → use case → repository interface (domain) → Prisma adapter (infrastructure)`), gated by `@RequirePermissions("report:view")`. Full request/response contract: `packages/contracts/src/dashboard/executive-summary.schema.ts`.

## KPI definitions (what each number actually measures, against the real schema)
| KPI | Query | Note |
|---|---|---|
| Total Revenue | `SUM(Payment.amount)` where `status = SUCCEEDED` | Not `RevenueLedgerEntry` — see below |
| Monthly Revenue | same, `createdAt` in current calendar month | |
| Monthly Profit | Monthly Revenue − `SUM(MaintenanceRecord.cost)` − `SUM(Payroll.netPay)` for the month | Real cost data, not invented — see below |
| Active Rentals | `COUNT(Booking)` where `status = ACTIVE` | |
| Available Cars | `COUNT(Car)` where `status = AVAILABLE`, not soft-deleted | |
| Cars Under Maintenance | `COUNT(Car)` where `status = MAINTENANCE` | |
| Cars Sold | `COUNT(Car)` where `status = SOLD` | |
| Pending Bookings | `COUNT(Booking)` where `status = PENDING` | |
| Active Customers | `COUNT(CustomerProfile)`, not soft-deleted | |
| Employee Attendance | present-today / active-employee-count | `COUNT(Attendance)` today `status=PRESENT` over `COUNT(Employee)` active |
| Revenue Trend | 6 monthly `SUM(Payment.amount)` buckets | One query per month (6 total), not a raw-SQL `date_trunc` groupby — simpler and correct at this scale |
| Cars by Status | `groupBy(Car.status)` | Feeds the fleet-by-status bar chart |

### Why revenue comes from `Payment`, not `RevenueLedgerEntry`
The Sprint 2 schema doc says revenue reporting should read from the `RevenueLedgerEntry` append-only ledger. But nothing writes to that table yet — no Booking-confirmation or payment-processing use case exists to populate it (Booking Management is a future module, out of scope this sprint). Querying an intentionally-empty table just to match the original design doc would mean the Executive Dashboard always shows $0, which is worse than being honest about using what's actually populated. **This is a documented, temporary substitution** — once a real payment/booking-confirmation use case exists and writes to `RevenueLedgerEntry`, the dashboard query should switch to reading from it instead (the two should reconcile to the same numbers, but the ledger is the auditable source of truth per the original design).

### Why Monthly Profit isn't invented
The schema has no generic "Expense" entity (Finance module's future "Manage Expenses" screen implies one doesn't exist yet). Rather than fabricate a profit number, Monthly Profit uses the two real cost sources the schema already tracks: maintenance costs and payroll. It will read low (often equal to revenue) until real `MaintenanceRecord`/`Payroll` data exists — that's accurate to the current data, not a bug.

## Charts (dataviz skill: form chosen by the data's job, before any color)
- **KPI numbers → stat tiles**, not one-bar bar charts (`choosing-a-form.md`: "a single current value... Stat tile, not a one-bar bar chart").
- **Revenue trend → line chart**, single series, sequential blue (`--chart-1`) — trend-over-time is the line chart's job.
- **Fleet by status → horizontal bar chart**, categorical, fixed color-per-status mapping that never changes based on which statuses are present in a given fetch (`color-formula.md`: "color follows the entity, never its rank"). Direct value labels since the CVD floor starts at 4 categories.

## Seed data extension
9 new roles added to `prisma/seed.ts` (see `04 Backend/RBAC.md`). A persistent test account, `superadmin@drivehub.example` / promoted to `SUPER_ADMIN`, exists in the dev database for trying the dashboard.

## Test plan (executed live against real Postgres data, not mocked)
1. Unauthenticated request → `401`.
2. Authenticated, no `report:view` permission → `403`, verified with a fresh real sign-up.
3. Authenticated with `report:view` (via `SUPER_ADMIN`) → `200`, every field checked by hand against what the seed data actually contains (1 car, 1 $100 payment, 2 customers, 1 active employee, 0 attendance records today).
4. Frontend: `tsc`, `eslint`, `next build` clean; pages verified live via HTTP (title tags, redirect behavior); RBAC error states (403) confirmed to render the real API error message, not a generic failure.
5. **Not yet done:** a real browser click-through of the sign-in → dashboard flow (same limitation noted for the Sprint 4 Auth module — no headless browser available in this environment).

## AI assistant status card (Sprint 7, added onto this dashboard)
`AiStatusCard` (`features/dashboard/components/ai-status-card.tsx`), rendered from `ExecutiveDashboardView`, calls `GET /ai/status` (cheap "is a provider configured" check, no live model call) and `GET /ai/logs?limit=3` for a "Recent AI activity" list. See `vault/07 AI/Customer-Assistant.md`.

## Known issues / follow-ups
- Revenue/Profit will read low until Booking/Payment-processing use cases exist and `RevenueLedgerEntry` starts getting written to (see above).
- No role-management UI yet — role grants are done via direct SQL.
- Session timeout for admin users uses the same 7-day default as customers (see `04 Backend/RBAC.md`).

## Next Module
Per "build one module completely before continuing," next up (in the order given) is **Fleet Management** — Add/Edit/Delete Car, image upload, documents, availability calendar, maintenance history, fuel records, GPS placeholder, insurance expiry alerts. That module will need real file storage (Cloudflare R2/Images, still not wired up anywhere in the stack) before "Upload Images" can be anything but a stub — worth flagging before starting it.
