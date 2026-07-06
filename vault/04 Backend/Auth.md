---
status: accepted
owner: Backend Engineer / Security Engineer
sprint: 4
---

# Authentication (Better Auth)

## How it's mounted
Better Auth is **not** wrapped in a NestJS controller — it's mounted directly on the underlying Express instance in `main.ts`, before Nest's own body-parser middleware:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
app.use("/api/auth", toNodeHandler(auth));   // Better Auth reads the raw request itself
app.use(express.json());                     // everything else gets normal body parsing
app.use(express.urlencoded({ extended: true }));
```
Nest's default body-parser would otherwise consume the request stream before Better Auth's handler can read it as a Fetch API `Request`. Because Express's `app.use(path, ...)` only invokes a middleware for requests under that path prefix, `/api/auth/*` never reaches `express.json()`, and every other route is unaffected. This is the standard integration pattern for mounting Better Auth inside a framework that owns its own HTTP pipeline (Express here, via Nest's platform-express adapter).

## Configuration (`src/modules/auth/auth.ts`)
- `database: prismaAdapter(prisma, { provider: "postgresql" })` — reuses `createPrismaClient()` from `@drivehub/database`, no separate connection.
- `basePath: "/api/auth"`, `baseURL` from `BETTER_AUTH_URL` (defaults to `http://localhost:<PORT>`).
- `trustedOrigins: [WEB_ORIGIN]` — required for Better Auth's own CSRF check on state-changing requests (verified: a `sign-out` POST without a matching `Origin` header is correctly rejected with `403 MISSING_OR_NULL_ORIGIN`).
- `emailAndPassword.enabled: true` — fully functional (see verification below).
- `socialProviders.google` / `.facebook` — only added to the config object if the corresponding `*_CLIENT_ID`/`*_CLIENT_SECRET` env vars are actually set. **No credentials are configured in this environment** (none were provided), so Google/Facebook sign-in is wired up correctly in code but inert until real OAuth app credentials are added to `apps/api/.env`. This isn't a placeholder — it's the same `betterAuth()` config real credentials would populate; there's just nothing to test against without registering real OAuth apps.

## Auto-provisioning hook
`databaseHooks.user.create.after` runs `provisionCustomer(user)` right after Better Auth inserts a new `User` row: it upserts the `CUSTOMER` role, creates the matching `CustomerProfile`, and assigns the role via `UserRole` — the same three writes `prisma/seed.ts` does by hand for the demo customer. This exists because `CustomerProfile` (not `User`) is what the rest of the domain — bookings, reviews, loyalty — actually references (DDD bounded-context split from the Sprint 2 schema), so a user who just signed up needs to become a real customer immediately, not just an auth record.

## Verified live (real HTTP calls against the running server + real Postgres)
| Call | Result |
|---|---|
| `POST /api/auth/sign-up/email` | `200`, User+Session+Account rows created; `CustomerProfile` + `CUSTOMER` role auto-provisioned (confirmed via direct SQL query) |
| `POST /api/auth/sign-in/email` (correct password) | `200`, new session token issued |
| `POST /api/auth/sign-in/email` (wrong password) | `401 INVALID_EMAIL_OR_PASSWORD` |
| `GET /api/auth/get-session` (with session cookie) | `200`, returns session + user |
| `POST /api/auth/sign-out` (no `Origin` header) | `403 MISSING_OR_NULL_ORIGIN` — CSRF protection working as intended |
| `POST /api/auth/sign-out` (with `Origin: http://localhost:3006`) | `200`, session invalidated; subsequent `get-session` returns `null` |
| `OPTIONS`/`GET` from `Origin: http://localhost:3006` | Correct `Access-Control-Allow-Origin`/`-Credentials` headers |
| `Set-Cookie` on sign-up | `HttpOnly; SameSite=Lax; Path=/`, no `Secure` (correct for local HTTP dev) |

`GET /api/cars` was re-checked after every restart to confirm mounting Better Auth didn't regress the existing Cars endpoints.

## Known gaps (explicitly out of scope this sprint)
- No route guards/decorators added yet — there are no protected NestJS endpoints to guard (Cars is intentionally public). A `CurrentUser` decorator + guard is straightforward to add once Booking/Sales need `req.user`, using `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` — not built speculatively ahead of a real consumer.
- No email verification flow (`requireEmailVerification` left at its default `false`) — sign-up works without confirming the email address. Worth revisiting before production.
- Google/Facebook social login: code-complete, untested without real OAuth app credentials (see above).
