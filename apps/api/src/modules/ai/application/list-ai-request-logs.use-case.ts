import { Inject, Injectable } from "@nestjs/common";
import { AI_REQUEST_LOG_REPOSITORY, type AiRequestLogRecord, type AiRequestLogRepository } from "../domain/ai-request-log.repository";

@Injectable()
export class ListAiRequestLogsUseCase {
  constructor(
    @Inject(AI_REQUEST_LOG_REPOSITORY) private readonly logs: AiRequestLogRepository,
  ) {}

  async execute(limit: number): Promise<{ items: AiRequestLogRecord[] }> {
    const items = await this.logs.listRecent(limit);
    return { items };
  }
}
