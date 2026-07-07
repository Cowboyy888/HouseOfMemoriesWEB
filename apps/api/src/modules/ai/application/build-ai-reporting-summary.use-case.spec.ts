import { describe, expect, it } from "vitest";
import { BuildAiReportingSummaryUseCase } from "./build-ai-reporting-summary.use-case";

describe("BuildAiReportingSummaryUseCase", () => {
  it("returns a healthy report for stable AI operations", async () => {
    const useCase = new BuildAiReportingSummaryUseCase();

    const result = await useCase.execute({
      totalRequests: 100,
      successfulRequests: 96,
      escalatedRequests: 2,
      avgLatencyMs: 800,
    });

    expect(result.headline).toContain("healthy");
    expect(result.successRate).toBe(0.96);
    expect(result.recommendations).toContain("Maintain current provider configuration");
  });
});
