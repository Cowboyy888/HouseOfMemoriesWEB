import { Injectable } from "@nestjs/common";
import type { AiProviderPort } from "../domain/ai-provider.port";
import { AnthropicProvider } from "./anthropic-provider";
import { OpenAiProvider } from "./openai-provider";

/** Which concrete provider AiProviderPort resolves to — the "allow
 * switching AI providers through configuration" requirement, done with one
 * env var (AI_PROVIDER=openai|anthropic, default openai) rather than a
 * customer-facing choice like Payments' provider selection, since nothing
 * about which LLM answers a chat message is the customer's decision to make. */
@Injectable()
export class AiProviderFactory {
  private readonly selected: AiProviderPort;

  constructor(openai: OpenAiProvider, anthropic: AnthropicProvider) {
    const configured = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
    this.selected = configured === "anthropic" ? anthropic : openai;
  }

  get(): AiProviderPort {
    return this.selected;
  }
}
