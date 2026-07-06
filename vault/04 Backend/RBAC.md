---
status: accepted
owner: Security Engineer / Backend Engineer
sprint: 5
---

# RBAC & Permission Guards

## Roles (as of Sprint 5)
The original Sprint 0 seed had generic `ADMIN`/`CUSTOMER`/`EMPLOYEE` roles. The Admin Dashboard's persona list needed real, distinct roles, added additively in `prisma/seed.ts` (kept `ADMIN` rather than deleting it — real `UserRole` rows already reference it):

`SUPER_ADMIN`, `COMPANY_OWNER`, `BRANCH_MANAGER`, `FLEET_MANAGER`, `SALES_MANAGER`, `HR_MANAGER`, `FINANCE_MANAGER`, `CUSTOMER_SUPPORT`, `STAFF`.

Only `SUPER_ADMIN`, `COMPANY_OWNER`, `BRANCH_MANAGER`, and `FINANCE_MANAGER` currently carry the `report:view` permission (reused from the Sprint 0 seed rather than inventing a new permission string) — the other five roles get their permissions assigned as their respective modules (Fleet, Sales, HR, Support) are built, not speculatively now.

## Enforcement pipeline
1. **`SessionMiddleware`** (`shared/auth/session.middleware.ts`) — registered globally via `AppModule.configure()`, calls `auth.api.getSession()` on every request and attaches the result to `req.authSession`. Never blocks; it's just attachment.
2. **`PermissionsGuard`** (`shared/auth/permissions.guard.ts`) — reads `@RequirePermissions(...)` metadata off the route; if the route requires permissions, requires `req.authSession.user` to exist (401 if not), then queries `UserRole → Role → RolePermission → Permission` for that user and checks every required `resource:action` string is present (403 if not).
3. **`@RequirePermissions("report:view")`** on `DashboardController.executiveSummary()` is the first real consumer.

This is genuinely enforced, not decorative — verified live (see below). The frontend (`apps/admin`) never re-implements this check; `AuthGuard` there only redirects to `/sign-in` when there's no session at all. Authorization failures (403) surface as real API errors the page displays, per "never duplicate backend logic" from the Sprint 5 brief.

## Verified live
| Scenario | Result |
|---|---|
| No session, `GET /api/dashboard/executive-summary` | `401 Sign in required` |
| Fresh sign-up (auto-assigned `CUSTOMER` only), same endpoint | `403 Insufficient permissions` |
| Same user promoted to `SUPER_ADMIN` via direct SQL (`user_roles` insert) | `200` + real aggregated data |

A persistent test account exists in the seeded dev database: `superadmin@drivehub.example` — created via a real Better Auth sign-up, then promoted to `SUPER_ADMIN` (this promotion step is exactly what a real "grant role" admin action will do once Settings → Roles & Permissions is built; for now it's a direct SQL statement, documented as a known gap below).

## Known gaps (explicitly out of scope this sprint)
- No UI yet to grant/revoke roles (that's Settings → Roles & Permissions, a later module) — promotions are done via direct SQL for now.
- No audit log entry is written when `PermissionsGuard` denies access — worth adding once there's a real admin-facing log viewer to read it back (Settings → Audit Logs), rather than writing to a table nothing displays yet.
- Session timeout is still Better Auth's default (7-day cookie) for both the customer site and the admin dashboard — a shorter admin session policy is a legitimate security hardening item, not implemented here since it requires either a second Better Auth instance or per-role session config that doesn't cleanly exist yet.
