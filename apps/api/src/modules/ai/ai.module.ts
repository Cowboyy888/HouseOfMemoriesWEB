import { Module } from "@nestjs/common";
import { BuildAiReportingSummaryUseCase } from "./application/build-ai-reporting-summary.use-case";
import { CustomerAssistantUseCase } from "./application/customer-assistant.use-case";
import { ListAiRequestLogsUseCase } from "./application/list-ai-request-logs.use-case";
import { RecommendVehiclesUseCase } from "./application/recommend-vehicles.use-case";
import { AI_CONTEXT_REPOSITORY } from "./domain/ai-context.repository";
import { AI_REQUEST_LOG_REPOSITORY } from "./domain/ai-request-log.repository";
import { RECOMMENDATION_CONTEXT_REPOSITORY } from "./domain/recommendation-context.repository";
import { AiProviderFactory } from "./infrastructure/ai-provider.factory";
import { AnthropicProvider } from "./infrastructure/anthropic-provider";
import { OpenAiProvider } from "./infrastructure/openai-provider";
import { PrismaAiContextRepository } from "./infrastructure/prisma-ai-context.repository";
import { PrismaAiRequestLogRepository } from "./infrastructure/prisma-ai-request-log.repository";
import { PrismaRecommendationContextRepository } from "./infrastructure/prisma-recommendation-context.repository";
import { AiController } from "./ai.controller";

@Module({
  controllers: [AiController],
  providers: [
    BuildAiReportingSummaryUseCase,
    CustomerAssistantUseCase,
    ListAiRequestLogsUseCase,
    RecommendVehiclesUseCase,
    AiProviderFactory,
    OpenAiProvider,
    AnthropicProvider,
    { provide: AI_CONTEXT_REPOSITORY, useClass: PrismaAiContextRepository },
    { provide: AI_REQUEST_LOG_REPOSITORY, useClass: PrismaAiRequestLogRepository },
    { provide: RECOMMENDATION_CONTEXT_REPOSITORY, useClass: PrismaRecommendationContextRepository },
  ],
})
export class AiModule {}
