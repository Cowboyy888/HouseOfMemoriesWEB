import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import OpenAI from "openai";
import type { AiChatMessage, AiChatResult, AiProviderPort } from "../domain/ai-provider.port";

const DEFAULT_MODEL = "gpt-4o-mini";

/** Inert without OPENAI_API_KEY — same "real code, unset until real
 * credentials exist" pattern as Stripe/ABA/Resend. */
@Injectable()
export class OpenAiProvider implements AiProviderPort {
  readonly provider = "OPENAI" as const;
  readonly configured: boolean;
  private readonly client: OpenAI | null;
  private readonly model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.configured = Boolean(apiKey);
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async chat(system: string, messages: AiChatMessage[]): Promise<AiChatResult> {
    if (!this.client) {
      throw new ServiceUnavailableException("OpenAI is not configured (OPENAI_API_KEY is unset)");
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "system", content: system }, ...messages],
    });

    const content = completion.choices[0]?.message.content ?? "";
    return { content, model: completion.model };
  }
}
