import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@drivehub/contracts";
import type { AiContextRepository } from "../domain/ai-context.repository";
import type { AiChatResult, AiProviderPort } from "../domain/ai-provider.port";
import type { AiRequestLogRepository } from "../domain/ai-request-log.repository";
import type { AiProviderFactory } from "../infrastructure/ai-provider.factory";
import { CustomerAssistantUseCase } from "./customer-assistant.use-case";

function makeContext(): AiContextRepository {
  return {
    findAvailableCarsSummary: vi.fn().mockResolvedValue([]),
    findRecentBookingsForCustomer: vi.fn().mockResolvedValue([]),
  };
}

function makeLogs(): AiRequestLogRepository {
  return { create: vi.fn(), listRecent: vi.fn().mockResolvedValue([]) };
}

function makeFactory(provider: AiProviderPort): AiProviderFactory {
  return { get: () => provider } as unknown as AiProviderFactory;
}

function makeProvider(result: AiChatResult): AiProviderPort {
  return { provider: "OPENAI", configured: true, chat: vi.fn().mockResolvedValue(result) };
}

const messages: ChatMessage[] = [{ role: "user", content: "Can I speak to a human?" }];

describe("CustomerAssistantUseCase", () => {
  it("passes through a normal reply unescalated", async () => {
    const provider = makeProvider({ content: "We have a Camry available for $65/day.", model: "gpt-4o-mini" });
    const logs = makeLogs();
    const useCase = new CustomerAssistantUseCase(makeFactory(provider), makeContext(), logs);

    const result = await useCase.execute(messages, null);

    expect(result).toEqual({ reply: "We have a Camry available for $65/day.", escalated: false });
    expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ succeeded: true, escalated: false }));
  });

  it("strips the ESCALATE: prefix and flags escalated", async () => {
    const provider = makeProvider({ content: "ESCALATE: Connecting you with our support team now.", model: "gpt-4o-mini" });
    const logs = makeLogs();
    const useCase = new CustomerAssistantUseCase(makeFactory(provider), makeContext(), logs);

    const result = await useCase.execute(messages, null);

    expect(result).toEqual({ reply: "Connecting you with our support team now.", escalated: true });
    expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ escalated: true }));
  });

  it("logs the failure and re-throws when the provider call fails", async () => {
    const provider: AiProviderPort = {
      provider: "OPENAI",
      configured: true,
      chat: vi.fn().mockRejectedValue(new Error("rate limited")),
    };
    const logs = makeLogs();
    const useCase = new CustomerAssistantUseCase(makeFactory(provider), makeContext(), logs);

    await expect(useCase.execute(messages, null)).rejects.toThrow("rate limited");
    expect(logs.create).toHaveBeenCalledWith(expect.objectContaining({ succeeded: false, errorMessage: "rate limited" }));
  });

  it("passes the resolved customerId through to the context lookup", async () => {
    const provider = makeProvider({ content: "You have one upcoming booking.", model: "gpt-4o-mini" });
    const context = makeContext();
    const useCase = new CustomerAssistantUseCase(makeFactory(provider), context, makeLogs());

    await useCase.execute(messages, "customer-1");

    expect(context.findRecentBookingsForCustomer).toHaveBeenCalledWith("customer-1", expect.any(Number));
  });
});
