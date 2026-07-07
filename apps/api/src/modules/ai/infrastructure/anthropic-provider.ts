import Anthropic from "@anthropic-ai/sdk";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { AiChatMessage, AiChatResult, AiProviderPort } from "../domain/ai-provider.port";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

/** Inert without ANTHROPIC_API_KEY — same pattern as OpenAiProvider. */
@Injectable()
export class AnthropicProvider implements AiProviderPort {
  readonly provider = "ANTHROPIC" as const;
  readonly configured: boolean;
  private readonly client: Anthropic | null;
  private readonly model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.configured = Boolean(apiKey);
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async chat(system: string, messages: AiChatMessage[]): Promise<AiChatResult> {
    if (!this.client) {
      throw new ServiceUnavailableException("Anthropic is not configured (ANTHROPIC_API_KEY is unset)");
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const content = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { content, model: message.model };
  }
}
