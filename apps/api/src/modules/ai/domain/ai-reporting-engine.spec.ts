import { describe, expect, it } from "vitest";
import { buildAiReportingSummary, type AiReportingInput } from "./ai-reporting-engine";

function makeInput(overrides: Partial<AiReportingInput> = {}): AiReportingInput {
  return {
    totalRequests: 120,
    successfulRequests: 110,
    escalatedRequests: 8,
    avgLatencyMs: 760,
    ...overrides,
  };
}

describe("buildAiReportingSummary", () => {
  it("builds an optimistic report when AI health is strong", () => {
    const report = buildAiReportingSummary(makeInput());

    expect(report.headline).toContain("healthy");
    expect(report.recommendations).toContain("Maintain current provider configuration");
  });

  it("flags operational issues when success rate drops and latency rises", () => {
    const report = buildAiReportingSummary(makeInput({
      successfulRequests: 70,
      escalatedRequests: 25,
      avgLatencyMs: 2200,
    }));

    expect(report.headline).toContain("needs attention");
    expect(report.recommendations).toContain("Investigate provider failures and latency bottlenecks");
  });
});
