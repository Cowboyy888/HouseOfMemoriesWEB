---
status: accepted
owner: Frontend Engineer
sprint: 4
---

# Auth (Frontend)

## Client
`src/lib/auth-client.ts` — `createAuthClient({ baseURL: env.apiOrigin })` from `better-auth/react`, pointed at the API's origin (`NEXT_PUBLIC_API_ORIGIN`, separate from `NEXT_PUBLIC_API_URL` which already carries the `/api` REST suffix used by `features/cars/api.ts`). Better Auth's client defaults its base path to `/api/auth` and combines it with this origin itself.

Exports used throughout the app: `authClient`, `signIn`, `signUp`, `signOut`, `useSession`.

## Why Next.js never talks to Postgres directly for auth
Better Auth's server-side instance (the one with database access) lives only in `apps/api`. `apps/web` only ever calls it over HTTP through `better-auth/react`'s client, the same way it calls the Cars REST endpoints — this keeps the Clean Architecture boundary from the Backend doc intact (the frontend has no `@drivehub/database` dependency at all, by design).

## Pages & components
- `features/auth/schemas.ts` — `signUpSchema`/`signInSchema` (Zod), validated client-side before the network call — same "never skip validation" principle as the Cars API responses, applied to form input.
- `features/auth/components/sign-up-form.tsx`, `sign-in-form.tsx` — controlled inputs, `authClient.signUp.email(...)`/`.signIn.email(...)`, field-level and form-level error display from both Zod and the API's own error response.
- `app/sign-up/page.tsx`, `app/sign-in/page.tsx` — thin pages, real `Metadata` for SEO.
- `components/site-header.tsx` — `useSession()`-driven nav: shows "Sign in / Sign up" or the user's name + "Sign out" depending on live session state. Wired into `app/layout.tsx` above `{children}` so it's present on every route.
- `app/account/page.tsx` — client component; redirects to `/sign-in` if `useSession()` resolves with no session, otherwise shows real session data (name, email, verified status, join date). Deliberately doesn't show booking history yet — that data doesn't exist until the Booking feature is built, and a fake/empty section would be exactly the kind of placeholder the project rules forbid.

## Verification (and its limit)
`tsc --noEmit`, `eslint`, and `next build` all pass clean; `/sign-up`, `/sign-in`, and `/account` (unauthenticated → loading shell, correct pre-redirect state) were checked live via HTTP against the running dev server, with correct per-page `<title>` tags. The backend endpoints these pages call (`sign-up/email`, `sign-in/email`, `get-session`, `sign-out`) were independently verified end-to-end against real Postgres data (see Backend `Auth.md`), and CORS/cookie behavior was verified for the exact cross-port origin (`localhost:3006` → `localhost:4000`) this dev setup uses.

**What wasn't verified:** actually clicking through the sign-up/sign-in forms in a real browser — there's no headless-browser tool available in this environment. The client-side code uses `better-auth/react`'s official, documented API (`createAuthClient`, `useSession`, `.signUp.email`, `.signIn.email`, `.signOut`) exactly as verified against the package's own type definitions, calling the already-proven backend endpoints — but a manual click-through (or a Playwright test, once the Testing sprint sets that up) is the remaining gap before calling this fully proven end-to-end.
