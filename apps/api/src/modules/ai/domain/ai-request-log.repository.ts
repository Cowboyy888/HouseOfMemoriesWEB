import type { AiModuleName, AiProvider } from "@drivehub/database";

export interface CreateAiRequestLogInput {
  module: AiModuleName;
  /** Null for deterministic modules (e.g. Recommendation) that don't call
   * an external LLM provider. */
  provider: AiProvider | null;
  customerId: string | null;
  promptSummary: string;
  responseSummary: string | null;
  succeeded: boolean;
  escalated: boolean;
  errorMessage: string | null;
  latencyMs: number;
}

export interface AiRequestLogRecord {
  id: string;
  module: AiModuleName;
  provider: AiProvider | null;
  customerId: string | null;
  promptSummary: string;
  responseSummary: string | null;
  succeeded: boolean;
  escalated: boolean;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: Date;
}

export const AI_REQUEST_LOG_REPOSITORY = Symbol("AI_REQUEST_LOG_REPOSITORY");

export interface AiRequestLogRepository {
  create(input: CreateAiRequestLogInput): Promise<void>;
  listRecent(limit: number): Promise<AiRequestLogRecord[]>;
}
