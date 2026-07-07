---
status: accepted
owner: Frontend Engineer
sprint: 6
---

# Booking, Payments, Invoices & Notifications UI (Sprint 6, Module 8)

First frontend work since Sprint 4 (Car Browsing) and Sprint 2 (Auth) — every backend module built earlier in Sprint 6 (Payments, Bookings, Invoices, Notifications, Booking Rules) had zero UI surface until this module. Resolves the two explicit gaps `05 Frontend/Architecture.md` flagged: "No Booking/Buy call-to-action on the detail page yet" and the account page's "Booking history... will show up here once the Booking feature is built" placeholder.

## Folder structure
```
features/
  bookings/
    api.ts, hooks.ts
    components/
      booking-widget.tsx        — date pickers + live price preview + Book Now, on the car detail page
      booking-status-badge.tsx
      my-bookings-list.tsx      — on the account page
  payments/
    api.ts, hooks.ts
    components/
      payment-method-selector.tsx  — Manual Bank Transfer / KHQR only (see below)
      payment-panel.tsx            — renders bank instructions or a real scannable QR code
      payment-status-badge.tsx
  invoices/
    api.ts, hooks.ts
    components/my-invoices-list.tsx   — on the account page
  notifications/
    api.ts, hooks.ts
    components/notification-bell.tsx  — in the site header

app/
  cars/[id]/page.tsx           — BookingWidget replaces the old "coming soon" placeholder
  account/page.tsx             — MyBookingsList + MyInvoicesList sections replace the placeholder text
  account/bookings/[id]/page.tsx  — new: booking detail, payment method selection, cancellation
```

Also touched: `lib/api-client.ts` (new — the authenticated-fetch counterpart to `features/cars/api.ts`'s public, cached fetches; `ApiError` moved here since it's genuinely shared, not cars-specific), `site-header.tsx` (notification bell), `sign-in-form.tsx` (now honors a `?redirect=` param so "Sign in to Book" returns the customer to the car they were booking, not always `/account`).

## Two fetch patterns, deliberately different
`features/cars/api.ts` uses plain `fetch()` with `next: { revalidate: 60 }` — public, cacheable catalog data. Everything in this module is user-specific and mutates, so `lib/api-client.ts`'s `authedFetch()` always sets `credentials: "include"` (to carry the Better Auth session cookie cross-origin) and `cache: "no-store"`. Verified this actually works cross-origin — not just assumed from the CORS config — by replaying the exact requests each component makes (same `Origin` header, same cookie jar) directly against the API: preflight `OPTIONS` returns `Access-Control-Allow-Credentials: true` for the web app's origin, and authenticated `GET`/`POST` calls to `/bookings/mine`, `/notifications/mine`, `/bookings`, `/payments`, and `/payments/:id` all round-trip correctly.

## Price preview, not a guess
`BookingWidget` calls `GET /bookings/availability` (Booking Rules' price-preview endpoint) as soon as both dates are valid, showing the actual rule-adjusted rate before the customer commits — not the car's flat list price. This can't drift from what `POST /bookings` actually charges, since both the widget and the "Book Now" mutation land on the same `resolveDailyRate()` call server-side (see `04 Backend/Booking-Rules.md`).

## Payment method selection: only what actually works
`PaymentMethodSelector` deliberately offers only **Manual Bank Transfer** and **KHQR** — not Stripe or ABA PayWay. Both of those are wired up server-side but inert without real credentials in this environment; offering them here would only ever dead-end in a `503` for a real user. KHQR's payment string is rendered as an actual scannable QR code via `qrcode.react` (`<QRCodeSVG>`) — a raw EMV string displayed as text would be useless for the entire point of KHQR (scan-to-pay).

## A design decision worth flagging: no "already has a pending payment" check
The booking detail page only knows about a payment if it just created one (passed via a `?paymentId=` query param) or if the page is revisited with that same URL. There's no `GET /payments?bookingId=...` list endpoint on the backend, so navigating away and back without the query param re-shows the payment method selector — a customer could technically submit a second Manual Bank Transfer reference for the same deposit. Not fixed here: building a "list payments for a payable" endpoint is backend scope, and is a real, worth-tracking gap rather than something to silently paper over on the frontend alone.

## Verified
- `npx turbo run build typecheck test` passes (9/9), including a real Next.js build (not just typecheck) — this caught a genuine issue: `useSearchParams()` in `SignInForm` (needed for the new `?redirect=` support) requires a Suspense boundary or the production build fails outright. Fixed by wrapping it in `<Suspense>` on the sign-in page; confirmed by rebuilding.
- **No browser automation tool is available in this environment** — the interactive flow (clicking through date pickers, seeing the QR render, clicking "Book Now") was not verified by literally driving a browser, and that limitation is stated here rather than glossed over. What *was* verified: every page returns `200` and renders real content server-side (`curl`'d the car detail page and confirmed "Pickup"/"Return"/"Sign in to Book" appear in the HTML, not an error boundary), and — more importantly — every network call each component makes was replayed directly against the real API with the exact `Origin` header and cookie a browser would send, end-to-end: sign up → check availability → create a booking → create a KHQR payment → fetch that payment back, all cross-origin, all successful. A human should still click through this once in an actual browser before considering it fully done.

## Known gaps / next module
- No "list payments for this booking" — see the design-decision note above.
- Sale/purchase checkout UI still doesn't exist (Car Sales is a later phase per Vision.md's roadmap; the car detail page shows a plain "coming in a later sprint" message for `SALE`-listed cars, same as before).
- Pickup/dropoff location is always defaulted to the car's current location — no location picker UI (the backend supports different pickup/dropoff locations; this UI pass doesn't expose choosing them).
- No Stripe/ABA PayWay option in the UI — see "Payment method selection" above; add them once real credentials make them worth offering.
- `apps/admin` still has no UI for any of Sprint 6's work (confirming Manual payments, processing refunds, managing pricing rules) — everything staff-side was only verified via direct API calls throughout Sprint 6.
