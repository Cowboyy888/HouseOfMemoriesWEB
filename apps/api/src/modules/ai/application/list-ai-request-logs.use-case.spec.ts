import { describe, expect, it, vi } from "vitest";
import type { AiRequestLogRepository } from "../domain/ai-request-log.repository";
import { ListAiRequestLogsUseCase } from "./list-ai-request-logs.use-case";

function makeLogs(): AiRequestLogRepository {
  return {
    create: vi.fn(),
    listRecent: vi.fn().mockResolvedValue([
      {
        id: "log-1",
        module: "CUSTOMER_ASSISTANT",
        provider: "OPENAI",
        customerId: "customer-1",
        promptSummary: "What cars do you have?",
        responseSummary: "We have several options.",
        succeeded: true,
        escalated: false,
        errorMessage: null,
        latencyMs: 320,
        createdAt: new Date("2026-07-07T02:00:00.000Z"),
      },
    ]),
  };
}

describe("ListAiRequestLogsUseCase", () => {
  it("returns the most recent AI request logs", async () => {
    const logs = makeLogs();
    const useCase = new ListAiRequestLogsUseCase(logs);

    const result = await useCase.execute(5);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ module: "CUSTOMER_ASSISTANT", provider: "OPENAI", succeeded: true });
    expect(logs.listRecent).toHaveBeenCalledWith(5);
  });
});
