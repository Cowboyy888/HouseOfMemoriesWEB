---
status: accepted
owner: Security Engineer
sprint: 2
---

# Security Considerations

## RBAC model
`Role` and `Permission` are decoupled and joined many-to-many both ways (`UserRole`, `RolePermission`), rather than a fixed enum on `User`. This lets Product add a new role (e.g. "Branch Manager") or a new permission (e.g. `payroll:approve`) without a schema migration touching `User`. Permissions follow a `resource:action` shape (`booking:create`, `car:manage`, `report:view`) — the NestJS authorization guard (Backend sprint) checks against this pair, not against role names directly, so business logic never hardcodes "if role is ADMIN."

`Role.isSystem` marks built-in roles (ADMIN, CUSTOMER, EMPLOYEE) that ship with the platform and shouldn't be deletable from the admin UI, distinct from custom roles an operator defines later.

## Sensitive fields and how they're protected
| Field(s) | Model | Handling |
|---|---|---|
| `Account.password`, `accessToken`, `refreshToken`, `idToken` | `Account` | Owned entirely by Better Auth's adapter; application code never reads/writes these directly. Encrypted at rest via Postgres-level encryption (see below); never logged. |
| `licenseNumber`, `documentImageUrl` | `DriverLicense` | PII. `documentImageUrl` points at a private Cloudflare R2 object (not Cloudflare Images' public delivery), fetched only via a signed URL issued per-request to an authorized employee/the license's own customer. |
| `dateOfBirth`, address fields | `CustomerProfile` | PII — excluded from any analytics export by default; only surfaced in admin/employee views that need it (identity verification, invoicing). |
| `Payment.providerPaymentId`, `Refund.providerRefundId` | Finance | Provider (Stripe) references only — no raw card data ever touches this database. Stripe.js/Elements handles card entry client-side; our tables only ever see tokens/IDs. This is a hard requirement, not a preference: it keeps the platform out of PCI SAQ D scope. |
| `Payroll.grossPay/netPay`, `PayrollLineItem.amount`, `SalaryRule.value` | HR | Compensation data — restricted to `payroll:view`/`payroll:manage` permissions; an employee can read their own `Payroll` rows but not another employee's (row-level check in the service layer, not the DB — Postgres RLS is a candidate future hardening step, noted below). |
| `AuthenticationLog.ipAddress/userAgent/metadata` | Identity | Audit data — write-only from the app's perspective in normal operation; read access restricted to Security/Admin roles. Retention policy (e.g. 1 year) to be set in the DevOps sprint, not enforced at the schema level. |

## Defense-in-depth beyond the schema
- **Encryption at rest**: handled at the Postgres/infrastructure layer (managed Postgres with disk encryption, or `pgcrypto` for column-level encryption on `licenseNumber` if the hosting provider doesn't guarantee disk encryption — decide in the DevOps sprint based on the chosen Postgres host).
- **Encryption in transit**: `sslmode=require` on `DATABASE_URL` in every non-local environment.
- **No secrets in the schema or seed data**: `.env` (git-ignored) holds `DATABASE_URL`; `.env.example` holds only a placeholder. `prisma/seed.ts` contains no real credentials, license numbers, or card data — only obviously-fake demo values.
- **Least-privilege DB roles**: the application's Postgres user should have `SELECT/INSERT/UPDATE/DELETE` on application tables but not `DROP`/`ALTER` in production — migrations run under a separate, more-privileged role/CI credential (`prisma migrate deploy` in the GitHub Actions pipeline, not from the running app).
- **Audit trail for authentication**: `AuthenticationLog` captures success/failure/lockout events independent of Better Auth's own session store, so security review doesn't depend on ephemeral session data.
- **Referential integrity as a security control, not just a data-quality one**: `onDelete: Restrict` on FKs like `Booking.customerId`/`Booking.carId`/`SaleTransaction.salesEmployeeId` prevents an admin action (deleting a customer or employee record) from silently orphaning financial history — that history has to be preserved or explicitly reassigned, never lost.

## Deferred / explicitly out of scope for this sprint
- **Postgres Row-Level Security (RLS)** for multi-branch data isolation (an employee at Branch A shouldn't query Branch B's bookings even if an application bug forgets the filter) — worth adding once the platform has more than a couple of branches; noted here so it isn't forgotten, not implemented now since it interacts with how the ORM connection pool authenticates (needs a `SET app.current_location_id` session variable pattern or Postgres roles per branch — an infra decision for the DevOps sprint).
- **Field-level encryption for `licenseNumber`** — deferred to the DevOps sprint's choice of Postgres host; only needed if the host doesn't already guarantee disk encryption.
- **Rate limiting / brute-force protection** on auth endpoints — a Backend/API-gateway concern (Redis-backed), not a schema concern; `AuthenticationLog` exists precisely so that feature has data to act on.
