export interface AiReportingInput {
  totalRequests: number;
  successfulRequests: number;
  escalatedRequests: number;
  avgLatencyMs: number;
}

export interface AiReportingSummary {
  headline: string;
  successRate: number;
  recommendations: string[];
}

export function buildAiReportingSummary(input: AiReportingInput): AiReportingSummary {
  const successRate = input.totalRequests === 0 ? 0 : input.successfulRequests / input.totalRequests;
  const recommendations: string[] = [];

  if (successRate >= 0.9 && input.avgLatencyMs <= 1000) {
    return {
      headline: "AI operations are healthy and performing within target bounds",
      successRate: Number(successRate.toFixed(2)),
      recommendations: ["Maintain current provider configuration", "Continue monitoring escalation rates"],
    };
  }

  recommendations.push("Investigate provider failures and latency bottlenecks");

  if (input.escalatedRequests > 0) {
    recommendations.push("Review escalation patterns and add safer fallback prompts");
  }

  return {
    headline: "AI operations needs attention",
    successRate: Number(successRate.toFixed(2)),
    recommendations,
  };
}
