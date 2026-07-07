import { Inject, Injectable } from "@nestjs/common";
import type { ChatMessage, ChatResponse } from "@drivehub/contracts";
import { AI_CONTEXT_REPOSITORY, type AiContextRepository } from "../domain/ai-context.repository";
import type { AiChatMessage } from "../domain/ai-provider.port";
import { AI_REQUEST_LOG_REPOSITORY, type AiRequestLogRepository } from "../domain/ai-request-log.repository";
import { AiProviderFactory } from "../infrastructure/ai-provider.factory";

const ESCALATE_PREFIX = "ESCALATE:";
const MAX_CATALOG_ITEMS = 15;
const MAX_BOOKING_HISTORY = 5;

/**
 * Answers FAQs, recommends vehicles, explains policies, and reports the
 * signed-in customer's own booking status — grounded in the real catalog
 * and the real customer's own bookings (via AiContextRepository), never
 * invented. Escalation is model-driven: the system prompt instructs the
 * model to prefix its reply with "ESCALATE:" when it can't help or the
 * customer explicitly asks for a human; that's stripped before the reply
 * reaches the customer and flagged in the audit log for staff review.
 * There's no live staff notification for this yet — Notification rows are
 * customer-scoped (see Notifications.md), so wiring a real staff alert
 * needs a different mechanism than reusing that model. Documented as a
 * known gap, not silently skipped.
 */
@Injectable()
export class CustomerAssistantUseCase {
  constructor(
    private readonly providerFactory: AiProviderFactory,
    @Inject(AI_CONTEXT_REPOSITORY) private readonly context: AiContextRepository,
    @Inject(AI_REQUEST_LOG_REPOSITORY) private readonly logs: AiRequestLogRepository,
  ) {}

  async execute(messages: ChatMessage[], customerId: string | null): Promise<ChatResponse> {
    const provider = this.providerFactory.get();
    const system = await this.buildSystemPrompt(customerId);
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const startedAt = Date.now();

    try {
      const result = await provider.chat(system, messages as AiChatMessage[]);
      const latencyMs = Date.now() - startedAt;
      const escalated = result.content.startsWith(ESCALATE_PREFIX);
      const reply = escalated ? result.content.slice(ESCALATE_PREFIX.length).trim() : result.content;

      await this.logs.create({
        module: "CUSTOMER_ASSISTANT",
        provider: provider.provider,
        customerId,
        promptSummary: lastUserMessage,
        responseSummary: reply,
        succeeded: true,
        escalated,
        errorMessage: null,
        latencyMs,
      });

      return { reply, escalated };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.logs.create({
        module: "CUSTOMER_ASSISTANT",
        provider: provider.provider,
        customerId,
        promptSummary: lastUserMessage,
        responseSummary: null,
        succeeded: false,
        escalated: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latencyMs,
      });
      throw error;
    }
  }

  private async buildSystemPrompt(customerId: string | null): Promise<string> {
    const cars = await this.context.findAvailableCarsSummary(MAX_CATALOG_ITEMS);
    const carLines =
      cars.length === 0
        ? "No vehicles are currently available."
        : cars
            .map((c) => {
              const price = c.dailyRentalRate != null ? `$${c.dailyRentalRate.toFixed(2)}/day` : null;
              const sale = c.salePrice != null ? `$${c.salePrice.toFixed(2)} to buy` : null;
              const priceLabel = [price, sale].filter(Boolean).join(", ");
              return `- ${c.brand} ${c.model} (${c.year}), ${c.category}, ${c.listingType}${priceLabel ? `, ${priceLabel}` : ""}`;
            })
            .join("\n");

    let bookingSection = "The customer is not signed in — you cannot look up bookings; ask them to sign in.";
    if (customerId) {
      const bookings = await this.context.findRecentBookingsForCustomer(customerId, MAX_BOOKING_HISTORY);
      bookingSection =
        bookings.length === 0
          ? "This signed-in customer has no bookings yet."
          : bookings
              .map(
                (b) =>
                  `- ${b.bookingNumber}: ${b.carLabel}, status ${b.status}, ${b.startDate.toDateString()} to ${b.endDate.toDateString()}`,
              )
              .join("\n");
    }

    return `You are the DriveHub customer assistant for an enterprise car rental & car sales platform.

Scope: recommend vehicles from the catalog below, answer FAQs about rental policies and payment options, and report on the signed-in customer's own bookings. You cannot see any other customer's data.

Policies:
- A booking requires a refundable deposit (20% of the rental total) to be confirmed.
- Accepted payment methods right now: Manual Bank Transfer and KHQR (Cambodia). Card and ABA PayWay exist in the system but may be temporarily unavailable.
- A booking can be cancelled by the customer while it is PENDING or CONFIRMED.
- A booking auto-confirms once its deposit payment is verified as succeeded.

Available vehicles:
${carLines}

${bookingSection}

Rules:
- Be concise and helpful.
- Never invent a price, policy, or booking detail that isn't given above.
- If you cannot help (legal disputes, account deletion, or the customer explicitly asks for a human), reply with "${ESCALATE_PREFIX}" followed by a short, polite message telling them you're connecting them with support — nothing else in that reply.`;
  }
}
