---
status: accepted
owner: Backend Engineer / Security Engineer
sprint: 6
---

# Payments (Sprint 6 Modules 1 & 3)

Module 1 built the provider abstraction layer. Module 3 ("Payment Features") added deposit/installment amount enforcement, refunds, and a real fix for a bug Module 3's own testing surfaced. Invoices and notifications are still later modules in this sprint.

## Architecture

Repository/Strategy pattern per ADR-004 and ADR-013: application code never branches on which payment provider is in use.

```
apps/api/src/modules/payments/
  domain/
    payment-provider.port.ts       — PaymentProviderPort interface (createPayment/verifyPayment/refundPayment)
    payment.repository.ts          — PaymentRepository port (now includes refunds; has updateStatus too)
    payable-resolver.ts            — PayableResolver port (owner + amountDue for a Booking/Sale/PaymentSchedule)
    installment-schedule.repository.ts — InstallmentScheduleRepository port (Module 3)
    refund.repository.ts           — RefundRepository port (Module 3)
    idempotency-store.ts           — IdempotencyStore port
  application/
    create-payment.use-case.ts
    get-payment.use-case.ts
    verify-payment.use-case.ts
    reconcile-payment-webhook.use-case.ts
    handle-payment-success.use-case.ts   — Module 3: auto-confirm booking / record installment on SUCCEEDED
    confirm-manual-payment.use-case.ts   — Module 3: staff marks a Manual payment SUCCEEDED
    create-refund.use-case.ts            — Module 3
    payment.mapper.ts
  infrastructure/
    prisma-payment.repository.ts
    prisma-payable-resolver.ts
    prisma-idempotency-store.ts
    prisma-installment-schedule.repository.ts
    prisma-refund.repository.ts
    webhook-signature.util.ts
    providers/
      stripe-payment.provider.ts
      aba-payway-payment.provider.ts
      khqr-payment.provider.ts
      manual-bank-transfer.provider.ts
      payment-provider.registry.ts
  webhooks/
    stripe-webhook.controller.ts
    aba-payway-webhook.controller.ts
  payments.controller.ts
  payments.module.ts
```

`CustomerProfileResolver` moved to `apps/api/src/shared/customer/` in Module 2 once Bookings needed the same lookup — see Bookings.md.

`PayableResolver` reads Booking/SaleTransaction/PaymentSchedule directly via Prisma rather than depending on those modules' own use-cases — it only needs to answer "who owns this and what's still due," not their full business logic. **Update (Module 5):** `HandlePaymentSuccessUseCase` no longer calls `ConfirmBookingUseCase`/`GenerateInvoiceForPaymentUseCase` directly — `PaymentsModule` has zero cross-module imports now. It emits `PaymentSucceededEvent` instead; Bookings, Invoices, and Notifications each listen for it independently. See `04 Backend/Notifications.md` and ADR-017 for the full refactor.

## Database changes
- `PaymentMethod` gained `QR_CODE`; `PaymentProvider` gained `ABA_PAYWAY` and `KHQR` (was Stripe/Manual only).
- `Payment.providerMetadata Json?` — generic bag for provider-specific data the client needs (Stripe `clientSecret`, ABA `checkoutUrl`, KHQR `qr`/`md5`, Manual `bankInstructions`). One JSON column rather than four provider-specific columns, since only one provider's data is ever populated per row.
- New `IdempotencyKey` model (`key` unique, `requestHash`, `statusCode`, `responseBody`, `expiresAt`) — see Idempotency section below.
- Migration: `packages/database/prisma/migrations/20260706074641_payment_provider_architecture/`.

## API
| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/payments` | `payment:create` (CUSTOMER) | Body validated by `CreatePaymentRequestSchema`. Requires `idempotencyKey`. Amount must exactly match the payable's `amountDue` (Module 3). |
| `GET` | `/api/payments/:id` | `payment:read` (CUSTOMER, own only) | 403 if the payment doesn't belong to the requesting customer. Response now includes `refunds`. |
| `POST` | `/api/payments/:id/verify` | `payment:read` (CUSTOMER, own only) | Re-polls the provider; reconciles status and runs `HandlePaymentSuccessUseCase` if it just became `SUCCEEDED`. |
| `POST` | `/api/payments/:id/confirm-manual` | `payment:update` (staff) | Module 3. Marks a `MANUAL` payment `SUCCEEDED`; `400` for any other provider. Idempotent. |
| `POST` | `/api/payments/:id/refunds` | `payment:refund` (staff, finance-adjacent roles) | Module 3. Partial or full refund; `400` if it would exceed the remaining refundable balance. |
| `POST` | `/api/payments/webhooks/stripe` | none (signature-verified) | Requires raw body — see main.ts note below. Runs `HandlePaymentSuccessUseCase` on a success event. |
| `POST` | `/api/payments/webhooks/aba-payway` | none (signature-verified) | `X-PayWay-HMAC-SHA512` header. Same success hook. |

RBAC additions across Modules 1 & 3, all in `prisma/seed.ts`'s `permissionDefs` (ADMIN gets every permission automatically via the existing seed loop):
- `payment:create`, `payment:read` → `CUSTOMER`
- `payment:update` → `SUPER_ADMIN`, `COMPANY_OWNER`, `BRANCH_MANAGER`, `CUSTOMER_SUPPORT` (same list as `booking:update` — confirming a bank transfer and confirming its booking are typically one support interaction)
- `payment:refund` → `SUPER_ADMIN`, `COMPANY_OWNER`, `FINANCE_MANAGER` only — deliberately narrower than `payment:update`, and never `CUSTOMER`

## Deposits & installments (Module 3)
`PayableResolver.resolve()` now returns `amountDue`, computed net of already-`SUCCEEDED` payments:
- **Booking** → `depositAmount - sum(SUCCEEDED payments for this booking)`.
- **PaymentSchedule** (installments) → `amountDue - amountPaid` on the schedule row itself.
- **SaleTransaction** (cash sale) → `salePrice - sum(SUCCEEDED payments for this sale)` — installment-financed sales go through PaymentSchedule instead, so this only covers a full cash payment.

`CreatePaymentUseCase` rejects a request if `amountDue <= 0` (`409`, already paid in full) or if `request.amount !== amountDue` (`400`, tells the caller the exact amount required) — closing a real gap Module 1 left open: the client used to supply an arbitrary `amount` with no server-side check against what was actually owed.

`HandlePaymentSuccessUseCase` runs whenever a Payment transitions to `SUCCEEDED` (from `CreatePaymentUseCase`'s synchronous path, `VerifyPaymentUseCase`, `ReconcilePaymentWebhookUseCase`, or `ConfirmManualPaymentUseCase`):
- If `bookingId` is set → calls `ConfirmBookingUseCase` (idempotent — no-ops if already `CONFIRMED`).
- If `paymentScheduleId` is set → `InstallmentScheduleRepository.recordPayment()` increments `PaymentSchedule.amountPaid`, marks it `PAID` once fully covered, and marks the parent `InstallmentPlan` `COMPLETED` once every schedule row for it is `PAID`.
- A cash Sale payment succeeding does **not** drive any `SaleTransaction.status` transition — there's no Sales module yet to own that rule (Car Sales is a later phase per Vision.md), unlike Bookings. Documented gap, not a guess.

## A real bug Module 3's own testing found and fixed
Manual Bank Transfer payments start `PENDING` and `verifyPayment()` always returns `PENDING` (there's no external system to poll) — so before this fix, a Manual payment could **never** reach `SUCCEEDED` through any existing code path. Since `amountDue` only nets out `SUCCEEDED` payments, this meant a customer could submit unlimited duplicate deposit payments against the same booking; live-testing the deposit flow surfaced it immediately (a second $65 payment against an already-paid $65 deposit returned `201` instead of `409`).

Fixed with `ConfirmManualPaymentUseCase` (`POST /api/payments/:id/confirm-manual`, staff-only) — the explicit "I checked the bank statement, this arrived" action Manual Bank Transfer structurally requires. It marks the payment `SUCCEEDED` and runs `HandlePaymentSuccessUseCase`, which is what was actually missing: staff could already flip a *booking* to `CONFIRMED` directly (Module 2's `/bookings/:id/confirm`), but nothing ever flipped the *payment* itself, leaving Payment and Booking state permanently out of sync. See ADR-015.

## Idempotency
`POST /api/payments` requires a client-generated `idempotencyKey`. `CreatePaymentUseCase`:
1. Looks up the key. If found with a matching request hash and a completed response, replays it (whether success or error) instead of re-running anything.
2. If found with a *different* request hash, `409 Conflict` — the key was reused for a different request body.
3. If not found, reserves the key immediately (unique constraint), so a second concurrent request with the same key fails fast on the DB constraint rather than both hitting the payment provider.
4. On completion (success **or** failure), the response is cached against the key. Caching failures too (mirroring Stripe's own idempotency semantics) matters: without it, a reserved-but-never-completed key would 409 on every retry for the full 24h TTL, turning a transient failure into a dead key instead of something safely retryable.

Verified live: replaying the same key returns the identical payment (not a second row); reusing a key with a different amount returns `409`.

## Providers

### Manual Bank Transfer
No external dependency. Returns a reference number + bank instructions immediately (`PENDING`). Status only changes when staff confirm the transfer — there's no external system to poll (`verifyPayment` is a no-op that always returns `PENDING`). Refunds are out-of-band (bank transfer back), so `refundPayment` throws `400`.

### KHQR (Cambodia — Bakong/NBC National QR standard)
Uses the official `bakong-khqr` npm package rather than hand-rolling the EMV/TLV/CRC encoding — a subtly-wrong hand implementation would produce QR codes that *look* valid but fail to scan, which is worse than not building it. The package ships no TypeScript types; the API surface used here was verified directly against the installed package source (`node_modules/bakong-khqr/src`) and against the official **Bakong KHQR SDK Documentation (NBC, v2.9, May 2025)**, not guessed.

QR generation (`BakongKHQR.generateMerchant()`) is a **pure local function** — no network call, no live merchant credentials required — so it's genuinely testable without real Bakong onboarding. `KhqrPaymentProvider` falls back to demo merchant values (`drivehub_demo@wing`, etc.) when `BAKONG_ACCOUNT_ID`/`BAKONG_MERCHANT_*`/`BAKONG_ACQUIRING_BANK` aren't set in the environment, specifically so this path works out of the box.

A non-zero amount makes the KHQR "dynamic," which the spec requires an `expirationTimestamp` for (discovered by hitting the SDK's own validation live — `Expiration timestamp is required for dynamic KHQR` — not from the PDF, which doesn't spell out this interaction); set to 15 minutes from creation.

**Caveat (unverified against an authoritative source):** checking whether a generated QR was actually paid needs a live Bakong merchant account and calls the Bakong Open API. The official SDK PDF covers only generate/decode/verify/deeplink — it does **not** document a "check transaction status" endpoint. `KhqrPaymentProvider.verifyPayment()` calls `POST https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5`, which is the endpoint used across community integration guides, gated behind `BAKONG_API_TOKEN`. Treat this endpoint as unverified until confirmed against an NBC source or real merchant sandbox access.

### Stripe
Standard `stripe` SDK, `PaymentIntent`-based. `createPayment` creates a PaymentIntent with `automatic_payment_methods` enabled and returns the `client_secret` for Stripe Elements/Payment Element on the frontend. Inert without `STRIPE_SECRET_KEY` — same pattern as Better Auth's Google/Facebook OAuth (real code, no placeholder, just unconfigured). Verified live: returns a clean `503` rather than crashing when unconfigured.

### ABA PayWay (Cambodia)
Signs (and verifies) requests the way ABA's merchant integration guide documents: sort field names ascending, concatenate values in that order, HMAC-SHA512 with the merchant API key, base64-encode (`signAbaPayWayFields`, shared between request signing and webhook verification). **Lower confidence than KHQR**: the exact purchase/check-transaction/refund field contract is based on ABA's publicly documented integration guide, not verified against an SDK as authoritative as the Bakong PDF — flag this if ABA's API rejects requests once real credentials are available. Inert without `ABA_PAYWAY_MERCHANT_ID`/`ABA_PAYWAY_API_KEY`; verified live to fail cleanly with `503` when unconfigured.

## Webhooks
- **Stripe**: needs the *raw* request body for signature verification. `main.ts` mounts `express.raw({ type: "application/json" })` on `/api/payments/webhooks/stripe` before the global `express.json()` — the same technique already used to give Better Auth an unparsed body. `Stripe.webhooks.constructEvent()` is a static call (no live API key needed to verify a signature).
- **ABA PayWay**: normal parsed JSON/form body works, since the hash is computed over field *values*, not raw bytes. Verified with a constant-time comparison (`timingSafeEqualStrings`) against the `X-PayWay-HMAC-SHA512` header.
- Both webhook handlers reconcile via `ReconcilePaymentWebhookUseCase`, which looks up the `Payment` by `providerPaymentId`. An unknown `providerPaymentId` (wrong environment, replayed test event) is logged and acked `200` rather than erroring — there's nothing to reconcile, and erroring would make the provider retry forever.

## Refunds (Module 3)
`POST /api/payments/:id/refunds` (`payment:refund`, staff/finance-only, no ownership check) — `CreateRefundUseCase`:
1. Payment must be `SUCCEEDED` or `PARTIALLY_REFUNDED` (`400` otherwise, including `REFUNDED`).
2. Computes `remaining = payment.amount - sum(PROCESSED refunds for this payment)`; `400` if the requested amount exceeds it. Supports partial refunds (repeatable up to `remaining`).
3. Calls `provider.refundPayment()` via the registry, keyed by the payment's own provider.
4. Creates a `Refund` row (`status`: `PROCESSED` if the provider confirmed it synchronously, else `PENDING`).
5. Updates `Payment.status` to `REFUNDED` (fully covered) or `PARTIALLY_REFUNDED` (partially covered) — based only on `PROCESSED` refunds, not `PENDING` ones.

`GET /api/payments/:id` now returns a `refunds` array so refund history is visible without a separate endpoint.

**Known gap, not silently papered over:** step 5 only counts `PROCESSED` refunds. A refund that comes back `PENDING` from the provider (ABA PayWay always does; Stripe usually resolves synchronously) isn't reconciled by a webhook — there's no refund-specific webhook built this module (only payment-success webhooks exist). A second refund attempt before a `PENDING` one resolves could over-refund with a provider that returns `PENDING`. Low real-world risk today since Manual and KHQR can't refund via API at all (both `refundPayment()` implementations throw `400` by design), and Stripe/ABA are both currently unconfigured — but flag this for whoever wires up real Stripe/ABA credentials.

**Verification limits:** the refund *rejection* paths (wrong permission, unsupported provider) were verified live. The refund *success* path (partial → `PARTIALLY_REFUNDED` → full → `REFUNDED` status transitions, remaining-balance math) could not be exercised end-to-end live in this environment — Manual and KHQR both correctly reject all refunds by design, and Stripe/ABA are inert without real credentials, so there is no configured provider that can complete a refund here. Verified by tracing the arithmetic by hand instead of live execution; flagged rather than assumed correct.

## Security
- No raw card numbers or provider secrets stored — `providerMetadata` only ever holds what the client needs to complete/display the payment (Stripe client secret, KHQR QR string, ABA checkout URL, bank instructions).
- Idempotency keys prevent duplicate payment creation from retried requests.
- Webhook signatures verified before trusting any payload (Stripe: SDK-verified; ABA: HMAC-SHA512, constant-time compare).
- Ownership enforced at the use-case level: a customer can only create a payment for a Booking/SaleTransaction/PaymentSchedule they own, and can only read their own payments — verified live with a second test customer (both attempts correctly `403`).

## Verified live
| Scenario | Result |
|---|---|
| Manual Bank Transfer create | `201`, real reference + bank instructions returned |
| Idempotent replay (same key) | Identical payment returned, no second row created |
| Idempotency key reused with different amount | `409 Conflict` |
| KHQR create | Real EMV QR string generated; independently re-verified with `BakongKHQR.verify()` (CRC valid) and `BakongKHQR.decode()` (all fields — amount, currency, merchant, timestamps — round-tripped correctly) |
| `GET /api/payments/:id` as owner | `200` |
| `GET /api/payments/:id` with no session | `401` |
| `GET /api/payments/:id` as a different customer | `403` |
| `POST /api/payments` for another customer's booking | `403` |
| `POST /api/payments/:id/verify` (Manual) | `200`, stays `PENDING` (no external system to poll) |
| Stripe create (unconfigured) | Clean `503`, not a crash |
| ABA PayWay create (unconfigured) | Clean `503`, not a crash |
| Failed create, retried with same idempotency key | Cached `503` replayed |
| **Module 3:** pay wrong amount against a booking's deposit | `400`, tells the caller the exact amount required |
| Pay the exact deposit amount (Manual) | `201`, `PENDING` |
| Staff confirms the Manual payment (`/confirm-manual`) | `200`, `SUCCEEDED` — and the linked booking auto-transitioned `PENDING` → `CONFIRMED` |
| Second deposit payment attempt after the first succeeded | `409` "already paid in full" — **this caught a real bug**, see below |
| Re-confirming an already-`SUCCEEDED` Manual payment | `200`, no-op (idempotent) |
| Customer attempts `/confirm-manual` or `/refunds` | `403` (wrong permission) |

Full workspace gate (`npx turbo run build typecheck`) passes with these changes.

## Known gaps / next module
- Refund success path (status transitions, remaining-balance math) verified by code trace, not live execution — see Refunds section above for why.
- Refund `PENDING` results aren't reconciled by a webhook — see Refunds section.
- A cash Sale payment succeeding doesn't drive any `SaleTransaction.status` transition — no Sales module exists yet.
- Bakong transaction-status endpoint is unverified against an authoritative NBC source (see KHQR section above).
- ABA PayWay's exact field contract is inferred from public docs, not a verified SDK — same caveat as above.
- Invoices and notifications are still later Sprint 6 modules.

**Sprint 9 fix:** Stripe (`createPayment`/`verifyPayment`/`refundPayment`) and KHQR (`verifyPayment`'s `fetch()` call) had no try/catch around the actual network call — a `StripeConnectionError`/`StripeAPIError` or a DNS/timeout failure propagated uncaught instead of the clean `503` the "not configured" case already returns. Both now translate live network/API failures into `ServiceUnavailableException`, landing in the same idempotency-failure-recording path as any other error (see ADR-020). Card declines / invalid-request errors are deliberately left untranslated — those are real outcomes, not provider unavailability.
