import { describe, expect, it } from "vitest";
import { analyzeSentiment, type SentimentAnalysisInput } from "./sentiment-analysis-engine";

function makeInput(overrides: Partial<SentimentAnalysisInput> = {}): SentimentAnalysisInput {
  return {
    text: "The car was great and the pickup was smooth.",
    ...overrides,
  };
}

describe("analyzeSentiment", () => {
  it("detects positive feedback from strong positive terms", () => {
    const result = analyzeSentiment(makeInput());

    expect(result.label).toBe("POSITIVE");
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.highlights).toContain("great");
  });

  it("detects negative feedback when complaints dominate", () => {
    const result = analyzeSentiment(makeInput({
      text: "The experience was terrible, slow, and frustrating.",
    }));

    expect(result.label).toBe("NEGATIVE");
    expect(result.score).toBeLessThan(-0.2);
    expect(result.highlights).toContain("terrible");
  });
});
