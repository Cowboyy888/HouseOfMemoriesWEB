export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResult {
  content: string;
  model: string;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

/** Strategy pattern, same shape as PaymentProviderPort (ADR-004/013) —
 * every AI module goes through this so switching OPENAI_API_KEY/
 * ANTHROPIC_API_KEY (or the AI_PROVIDER env var that picks between them)
 * never touches application code. `system` is a separate parameter (not a
 * message with role "system") because Anthropic's API has no system role
 * in its message array — it's a top-level field — so this interface
 * matches the lowest common denominator rather than leaking OpenAI's
 * shape into the port. */
export interface AiProviderPort {
  readonly provider: "OPENAI" | "ANTHROPIC";
  chat(system: string, messages: AiChatMessage[]): Promise<AiChatResult>;
}
