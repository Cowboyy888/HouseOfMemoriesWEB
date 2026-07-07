import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { AiRequestLogRepository, CreateAiRequestLogInput } from "../domain/ai-request-log.repository";

const SUMMARY_MAX_LENGTH = 500;

function truncate(value: string): string {
  return value.length > SUMMARY_MAX_LENGTH ? `${value.slice(0, SUMMARY_MAX_LENGTH)}…` : value;
}

@Injectable()
export class PrismaAiRequestLogRepository implements AiRequestLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAiRequestLogInput): Promise<void> {
    await this.prisma.client.aiRequestLog.create({
      data: {
        module: input.module,
        provider: input.provider,
        customerId: input.customerId,
        promptSummary: truncate(input.promptSummary),
        responseSummary: input.responseSummary ? truncate(input.responseSummary) : null,
        succeeded: input.succeeded,
        escalated: input.escalated,
        errorMessage: input.errorMessage,
        latencyMs: input.latencyMs,
      },
    });
  }

  async listRecent(limit: number) {
    const rows = await this.prisma.client.aiRequestLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      module: row.module,
      provider: row.provider,
      customerId: row.customerId,
      promptSummary: row.promptSummary,
      responseSummary: row.responseSummary,
      succeeded: row.succeeded,
      escalated: row.escalated,
      errorMessage: row.errorMessage,
      latencyMs: row.latencyMs,
      createdAt: row.createdAt,
    }));
  }
}
