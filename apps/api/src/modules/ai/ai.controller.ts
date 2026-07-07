import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { ChatRequestSchema, RecommendationQuerySchema, type ChatRequest, type RecommendationQuery } from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { BuildAiReportingSummaryUseCase } from "./application/build-ai-reporting-summary.use-case";
import { CustomerAssistantUseCase } from "./application/customer-assistant.use-case";
import { ListAiRequestLogsUseCase } from "./application/list-ai-request-logs.use-case";
import { RecommendVehiclesUseCase } from "./application/recommend-vehicles.use-case";

@Controller("ai")
export class AiController {
  constructor(
    private readonly customerAssistantUseCase: CustomerAssistantUseCase,
    private readonly listAiRequestLogsUseCase: ListAiRequestLogsUseCase,
    private readonly recommendVehiclesUseCase: RecommendVehiclesUseCase,
    private readonly buildAiReportingSummaryUseCase: BuildAiReportingSummaryUseCase,
    @Inject(CUSTOMER_PROFILE_RESOLVER) private readonly customerProfiles: CustomerProfileResolver,
  ) {}

  // Public — an anonymous visitor can ask about the catalog/policies just
  // like they can browse cars without signing in; only booking-specific
  // answers require a session, checked internally, not by a route guard.
  @Post("chat")
  async chat(@Body(new ZodValidationPipe(ChatRequestSchema)) body: ChatRequest, @CurrentUser() user: { id: string } | null) {
    const customerId = await this.resolveCustomerId(user);
    return this.customerAssistantUseCase.execute(body.messages, customerId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions("report:view")
  @Get("logs")
  async logs(@Query("limit") limit = "5") {
    return this.listAiRequestLogsUseCase.execute(Number(limit));
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions("report:view")
  @Get("reporting")
  async reporting(
    @Query("totalRequests") totalRequests = "0",
    @Query("successfulRequests") successfulRequests = "0",
    @Query("escalatedRequests") escalatedRequests = "0",
    @Query("avgLatencyMs") avgLatencyMs = "0",
  ) {
    return this.buildAiReportingSummaryUseCase.execute({
      totalRequests: Number(totalRequests),
      successfulRequests: Number(successfulRequests),
      escalatedRequests: Number(escalatedRequests),
      avgLatencyMs: Number(avgLatencyMs),
    });
  }

  // Public for the same reason — recommendations are useful before signing
  // in; booking-history affinity only kicks in for a resolved session.
  @Get("recommendations")
  async recommendations(
    @Query(new ZodValidationPipe(RecommendationQuerySchema)) query: RecommendationQuery,
    @CurrentUser() user: { id: string } | null,
  ) {
    const customerId = await this.resolveCustomerId(user);
    return this.recommendVehiclesUseCase.execute(query, customerId);
  }

  private async resolveCustomerId(user: { id: string } | null): Promise<string | null> {
    if (!user) {
      return null;
    }
    const profile = await this.customerProfiles.resolveByUserId(user.id);
    return profile?.id ?? null;
  }
}
