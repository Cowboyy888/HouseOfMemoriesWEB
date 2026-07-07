---
status: accepted
owner: Backend Engineer
sprint: 6
---

# Notifications (Sprint 6, Module 5)

Fifth module of Sprint 6, and the trigger for a real architectural refactor: the domain-event bus ADR-015/016 flagged in advance as "reconsider once a third consumer of payment-success side effects shows up." Notifications is that third consumer.

## The event-bus refactor
Before this module, `PaymentsModule` directly imported `BookingsModule` and `InvoicesModule` so `HandlePaymentSuccessUseCase` could call their use-cases. Adding Notifications as a fourth direct import would have made `PaymentsModule` depend on every module that ever wants to react to a payment succeeding — the wrong direction for a payments module to grow in.

Replaced with `@nestjs/event-emitter` (`EventEmitterModule.forRoot()` in `AppModule`) and three plain-DTO domain events in `apps/api/src/shared/events/`:
- `payment-succeeded.event.ts` — emitted by `HandlePaymentSuccessUseCase`
- `booking-confirmed.event.ts` — emitted by `ConfirmBookingUseCase` (only on the real PENDING→CONFIRMED transition, not the idempotent no-op branch — so a duplicate confirm call doesn't send a duplicate notification)
- `booking-cancelled.event.ts` — emitted by `CancelBookingUseCase`

Each event is a small interface, not the emitting module's own entity type — so `BookingsModule`'s `PaymentSucceededListener` doesn't depend on `PaymentEntity`, and `NotificationsModule`'s listeners don't depend on either Payments' or Bookings' internal shapes.

**Result:** `PaymentsModule` now has zero cross-module imports (`payments.module.ts`'s `imports` array is empty). `BookingsModule` and `InvoicesModule` no longer `export` anything for a sibling module to consume — they each own a `PaymentSucceededListener` internally instead. This is a strictly better module graph than before, produced by following through on the threshold set two modules ago rather than just talking about it.

## Folder structure
```
apps/api/src/shared/events/
  payment-succeeded.event.ts
  booking-confirmed.event.ts
  booking-cancelled.event.ts

apps/api/src/modules/notifications/
  domain/
    notification.repository.ts       — NotificationRepository port
    email-sender.ts                  — EmailSender port
    customer-contact-resolver.ts     — CustomerContactResolver port (CustomerProfile.id -> email)
  application/
    create-notification.use-case.ts  — internal only, not exposed over HTTP
    list-my-notifications.use-case.ts
    mark-notification-read.use-case.ts
    payment-succeeded.listener.ts
    booking-confirmed.listener.ts
    booking-cancelled.listener.ts
    notification.mapper.ts
  infrastructure/
    prisma-notification.repository.ts
    prisma-customer-contact-resolver.ts
    resend-email-sender.ts
  notifications.controller.ts
  notifications.module.ts
```

Also touched: `PaymentsModule`, `BookingsModule`, `InvoicesModule` (emit/listen for the events above instead of direct calls), `AppModule` (`EventEmitterModule.forRoot()`).

## Database
New `Notification` model (`customer.prisma`) — this is the "notification center" `06 Dashboard/Architecture.md` explicitly deferred in Sprint 5 for lack of an event source. Real sources exist now. Fields: `type` (`NotificationType` enum), `title`, `body`, `readAt` (nullable — unread if null), `relatedBookingId`/`relatedPaymentId`/`relatedInvoiceId` (nullable, for deep-linking; not enforced FKs, just IDs — a notification outliving its related row isn't an error). Migration: `packages/database/prisma/migrations/20260706112700_notification_system/`.

## Email delivery
`EmailSender` port, `ResendEmailSender` implementation — inert without `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, same pattern as Stripe/ABA/Google/Facebook OAuth. **Different failure behavior, deliberately**: every other inert-credential path in this project throws a clean error when unconfigured, because the caller needs to know a real action didn't happen (a payment, an OAuth sign-in). Email is different — the in-app `Notification` row is the actual source of truth and already exists by the time `ResendEmailSender.send()` runs, so an unconfigured or failing email provider only logs and returns; it must never fail the booking/payment/invoice flow that triggered it.

`CustomerContactResolver` resolves a `CustomerProfile.id` (all Notifications ever has, from the events) to the linked `User.email` — the reverse direction of the existing `CustomerProfileResolver` (User → CustomerProfile), module-local since nothing else needs it.

## API
| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/notifications/mine` | `notification:read` (CUSTOMER) | `?unreadOnly=true` filter; response includes `unreadCount` alongside the paginated list. |
| `POST` | `/api/notifications/:id/read` | `notification:read` (CUSTOMER, own only) | Idempotent — marking an already-read notification read again is a no-op. |

No endpoint creates a notification directly — `CreateNotificationUseCase` is internal, only reachable from the three event listeners. `notification:read` added to `prisma/seed.ts`, granted to `CUSTOMER`.

## Verified live
Full chain exercised end-to-end (booking → deposit payment → staff `/confirm-manual`):
| Scenario | Result |
|---|---|
| One `PaymentSucceededEvent` | Booking auto-`CONFIRMED` **and** an invoice generated **and** a notification created — three independent listeners reacting to one emitted event |
| `BOOKING_CONFIRMED` notification | Correct title/body/`relatedBookingId` |
| `PAYMENT_SUCCEEDED` notification | Correct amount, `relatedPaymentId` and `relatedBookingId` both set |
| Cancel a separate booking | `BOOKING_CANCELLED` notification created with the cancellation reason in the body |
| `GET /api/notifications/mine` | All three notifications listed, `unreadCount: 2` initially |
| `POST /api/notifications/:id/read` | Marks read; `?unreadOnly=true` afterward correctly drops to the remaining unread |
| A different account marks someone else's notification read | `403` |
| Email send with `RESEND_API_KEY` unset | Logged debug line, no crash, no effect on the booking/payment/notification flow — confirmed by checking server logs, not just assumed |
| Resolving the customer's real email for that log line | Correct — `CustomerContactResolver` round-tripped `CustomerProfile.id` → `User.email` correctly |

Full workspace gate (`npx turbo run build typecheck`) passes.

## Known gaps / next module
- `NotificationType.INVOICE_ISSUED` is defined but unused — invoice generation piggybacks on the same `PAYMENT_SUCCEEDED` event Notifications already reacts to, so a *second* notification for the same moment would be redundant. Reserved for a future case where an invoice is issued independently of a payment succeeding (e.g. a staff-issued ad-hoc invoice, matching `InvoiceStatus.DRAFT`/`ISSUED`'s own reserved-but-unused status).
- No email templates/HTML — plain text via `text:`, matching the "don't build ahead of a real need" bar; a proper template system is a distinct future task.
- No dashboard-side "notification center" UI yet — this module unblocks it (the event source `06 Dashboard/Architecture.md` was waiting on now exists) but building that UI is an `apps/admin` concern for a later module.
- Bookings/Payments/Invoices modules no longer import each other, but this was a live refactor of already-shipped code — re-ran the full verification matrix from Payments.md/Bookings.md/Invoices.md implicitly via this module's own end-to-end test rather than re-running every prior scenario individually; flagged here for transparency rather than silently assumed unaffected.
