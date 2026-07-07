---
status: accepted
owner: Backend Engineer
sprint: 7
---

# AI Customer Assistant (Sprint 7, Module 1)

First module of Sprint 7 (AI Services & Business Automation), per the task's own instruction: "Begin with the AI Customer Assistant." Nine AI modules remain (Smart Vehicle Recommendation, Dynamic Pricing, Predictive Maintenance, BI Dashboard, Document OCR, Fraud Detection, Sentiment Analysis, AI Reporting), each to be built completely before the next per the task's own workflow rule.

## Architecture: Strategy pattern, same shape as Payments
`AiProviderPort` (`chat(system, messages)`) is implemented by `OpenAiProvider` and `AnthropicProvider`, selected by one `AiProviderFactory` reading `AI_PROVIDER` (default `openai`) — the same Repository/Strategy pattern ADR-004/013 established for payment providers, applied here because Sprint 7's own brief explicitly asks for "switching AI providers through configuration." `system` is a separate parameter from the message array (not a message with `role: "system"`) because Anthropic's Messages API has no system role in its messages array — it's a distinct top-level field — so the port's shape is the lowest common denominator across both providers rather than leaking OpenAI's shape into the interface.

## Folder structure
```
apps/api/src/modules/ai/
  domain/
    ai-provider.port.ts          — AiProviderPort, AiChatMessage/AiChatResult
    ai-request-log.repository.ts — audit logging port
    ai-context.repository.ts     — read-only grounding data port
  application/
    customer-assistant.use-case.ts (+ .spec.ts)
  infrastructure/
    openai-provider.ts
    anthropic-provider.ts
    ai-provider.factory.ts
    prisma-ai-request-log.repository.ts
    prisma-ai-context.repository.ts
  ai.controller.ts
  ai.module.ts
```

## Database
New `ai.prisma` schema file (first AI-specific models — more will land here as later Sprint 7 modules ship): `AiRequestLog` (module, provider, customerId, prompt/response summaries, succeeded, escalated, errorMessage, latencyMs) — the concrete implementation of Sprint 7's "log AI requests" security requirement, built once so every later AI module reuses it instead of rolling its own logging. Prompt/response are **truncated to 500 chars**, not stored verbatim — enough for debugging and audit without turning this table into its own unbounded PII liability. Migration: `packages/database/prisma/migrations/20260707012731_ai_services/`.

## Grounding: real data, not invented
The system prompt is built from `AiContextRepository`, which reads `Car`/`Booking` directly (same "lightweight cross-cutting read instead of a business-logic import" pattern `PayableResolver` established in Payments Module 1 — not a dependency on `BookingsModule`): the current available-car catalog (up to 15), and — only if the request carries a resolved session — that customer's own last 5 bookings. An anonymous visitor gets catalog/policy answers; booking-status questions get "please sign in" instead of a guess. The prompt explicitly instructs the model never to invent a price, policy, or booking detail beyond what's given.

## Escalation
Model-driven, not a keyword heuristic: the system prompt instructs the model to prefix its reply with `ESCALATE:` when it can't help or the customer explicitly asks for a human. `CustomerAssistantUseCase` strips that prefix before the reply reaches the customer and sets `escalated: true` in both the response and the audit log.

**Known gap, stated plainly:** there is no live staff notification when a conversation escalates. `Notification` rows are scoped to `customerId` (see `04 Backend/Notifications.md`) — there's no staff/employee notification target in that model, so reusing it would be a misuse of the schema, not a real fix. For now, escalated conversations are only visible via `AiRequestLog.escalated` — a real staff-facing alert is future admin-dashboard work, not built here.

## API
| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/ai/chat` | none (public) | `{ messages: [{role, content}] }` → `{ reply, escalated }`. Works for anonymous visitors (catalog/policy questions) and signed-in customers (adds their own booking status) — auth is read internally via the existing session middleware, not gated by a route guard, same as `GET /api/bookings/availability`. |

No new permission added — nothing here needs RBAC since the endpoint doesn't expose any other customer's data (the context repository only ever looks up the resolved caller's own `customerId`).

## Verified live
| Scenario | Result |
|---|---|
| Anonymous chat request, no `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` configured | Clean `503`, not a crash — confirms the whole pipeline (Zod validation → catalog context query → provider selection) runs correctly up to the actual API call |
| That failed attempt logged to `AiRequestLog` | Confirmed via direct query: correct `module`, `provider`, `promptSummary`, `succeeded: false`, and the exact error message |
| `AI_PROVIDER=anthropic` env override | The same request now fails with "Anthropic is not configured" instead of "OpenAI is not configured" — confirms the factory's config-driven switch actually works, not just reads correctly in code |
| Authenticated chat request, customer with a real booking | Same clean `503` (no crash) — confirms `CustomerProfileResolver` + `findRecentBookingsForCustomer` both ran without error before reaching the provider call |
| Unit tests (4 cases) | Escalation-prefix stripping, non-escalated pass-through, failure logging + re-throw, and that the resolved `customerId` is actually passed to the context lookup |

**What wasn't verified:** actual LLM output quality, since no real `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` exists in this environment — same documented limitation as Stripe/ABA PayWay in Payments.md. The architecture, grounding, escalation logic, and audit logging are all real and verified; the model's actual answers need a real key to evaluate.

## Known gaps / next module
- No live staff notification on escalation — see above.
- No conversation persistence — each request is stateless from the client's perspective (it resends its own message history), matching a simple chat-widget UX; no `ChatSession`/`ChatMessage` table exists, and wasn't added since Sprint 7's brief doesn't ask for conversation history retrieval as a feature.
- No RAG/vector search — the catalog is included directly in the system prompt (capped at 15 cars) rather than retrieved via embeddings. Sprint 7's own tech list marks "Vector database abstraction" as future-ready, not required now.
- Smart Vehicle Recommendation (with a per-car recommendation *score*), Dynamic Pricing, Predictive Maintenance, BI Dashboard, Document OCR, Fraud Detection, Sentiment Analysis, and AI Reporting are the next 8 modules in this sprint — not started.
