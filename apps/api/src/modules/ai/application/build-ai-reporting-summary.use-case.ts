import { Injectable } from "@nestjs/common";
import { buildAiReportingSummary, type AiReportingInput, type AiReportingSummary } from "../domain/ai-reporting-engine";

@Injectable()
export class BuildAiReportingSummaryUseCase {
  async execute(input: AiReportingInput): Promise<AiReportingSummary> {
    return buildAiReportingSummary(input);
  }
}
