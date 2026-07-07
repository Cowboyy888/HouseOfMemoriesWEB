---
status: accepted
owner: Backend Engineer
sprint: 6
---

# Invoices (Sprint 6, Module 4)

Fourth module of Sprint 6. The `Invoice`/`InvoiceLineItem` models have existed since the Sprint 2 schema but nothing wrote to them until now.

## Folder structure
```
apps/api/src/modules/invoices/
  domain/
    invoice.repository.ts   — InvoiceRepository port (create/findById/findMany, with lineItems included)
  application/
    generate-invoice-for-payment.use-case.ts  — exported for PaymentsModule
    get-invoice.use-case.ts
    list-my-invoices.use-case.ts
    invoice.mapper.ts
  infrastructure/
    prisma-invoice.repository.ts
  invoices.controller.ts
  invoices.module.ts
```

## Design: a receipt, not a bill
`GenerateInvoiceForPaymentUseCase` is called from Payments' `HandlePaymentSuccessUseCase` for **every** payment that reaches `SUCCEEDED` — deposit, cash sale, or installment, regardless of provider. Each invoice is generated already `status: PAID`, `issueDate === dueDate === now`, one line item describing the specific payment (e.g. "Booking deposit — Payment F1F2369E").

This is deliberately a receipt for a completed transaction, not a bill sent ahead of payment. This system collects money directly through the Payments API, which already validates the exact amount owed via `amountDue` (Module 3) — there's no "email an invoice, wait for it to be settled" flow to model. The `InvoiceStatus` enum's `DRAFT`/`ISSUED`/`VOID` values exist for that kind of pre-payment lifecycle (e.g. a staff-issued invoice for an ad-hoc fee) but aren't produced by anything yet — a real gap, not an oversight, since nothing in this sprint needs that flow.

`taxAmount` is always `0` — no tax rate/jurisdiction modeling exists anywhere in the schema, so anything else would be a guess.

## Cross-module wiring
**Update (Module 5):** originally `InvoicesModule` exported `GenerateInvoiceForPaymentUseCase` for `PaymentsModule` to import directly (same pattern as `BookingsModule`/`ConfirmBookingUseCase`). Once Notifications became a third consumer of "something happened on payment success," this was replaced with an event bus — `InvoicesModule` now has its own internal `PaymentSucceededListener` that calls `GenerateInvoiceForPaymentUseCase` when `PaymentSucceededEvent` fires, and no longer exports anything. See `04 Backend/Notifications.md` and ADR-017 for the full refactor. `GenerateInvoiceInput` remains `InvoicesModule`'s own DTO (customerId/amount/bookingId/saleTransactionId/description) rather than Payments' `PaymentEntity` type, so Invoices still doesn't depend on Payments' internal entity shape — the event, not Payments' own type, crosses the module boundary now.

## API
| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/invoices/mine` | `invoice:read` (CUSTOMER) | Paginated, newest first. |
| `GET` | `/api/invoices/:id` | `invoice:read` (CUSTOMER, own only) | `403` if it isn't the requester's own invoice. |

`invoice:read` added to `prisma/seed.ts`'s `permissionDefs`, granted to `CUSTOMER` (ADMIN gets it automatically via the existing seed loop). No staff-facing invoice endpoints yet — nothing to void/adjust since refunds don't touch invoices yet (see known gaps).

## Verified live
| Scenario | Result |
|---|---|
| Create booking → pay deposit (Manual) → staff confirms the payment | Payment `SUCCEEDED` |
| `GET /api/invoices/mine` after the above | One invoice, `PAID`, correct `subtotal`/`totalAmount` (= deposit amount), one line item "Booking deposit — Payment \<ref\>" |
| `GET /api/invoices/:id` as owner | `200` |
| `GET /api/invoices/:id` as a different customer/staff account | `403` |
| `GET /api/invoices/:id` with no session | `401` |

Full workspace gate (`npx turbo run build typecheck`) passes.

## Known gaps / next module
- No PDF rendering — `pdfUrl` stays `null`. Generating an actual PDF (templating + a renderer) is a distinct feature not attempted here rather than faked with a placeholder URL.
- Refunds (Module 3) don't adjust or void the invoice they relate to — a partially or fully refunded payment's invoice still shows the original `PAID` amount. Needs a credit-note or void concept, not built yet.
- A cash Sale payment still doesn't drive `SaleTransaction.status` (same gap noted in Payments.md) — its invoice is generated correctly regardless, since invoice generation only depends on the Payment succeeding.
- No staff-facing invoice list/management view — self-service only, matching the pattern in Bookings/Payments so far.
