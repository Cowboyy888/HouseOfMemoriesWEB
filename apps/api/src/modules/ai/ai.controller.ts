import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { ChatRequestSchema, RecommendationQuerySchema, type ChatRequest, type RecommendationQuery } from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { AiProviderFactory } from "./infrastructure/ai-provider.factory";
import { CustomerAssistantUseCase } from "./application/customer-assistant.use-case";
import { ListAiRequestLogsUseCase } from "./application/list-ai-request-logs.use-case";
import { RecommendVehiclesUseCase } from "./application/recommend-vehicles.use-case";

@Controller("ai")
export class AiController {
  constructor(
    private readonly customerAssistantUseCase: CustomerAssistantUseCase,
    private readonly listAiRequestLogsUseCase: ListAiRequestLogsUseCase,
    private readonly recommendVehiclesUseCase: RecommendVehiclesUseCase,
    private readonly aiProviderFactory: AiProviderFactory,
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

  // Cheap "is a provider configured" signal for the admin dashboard status
  // card — must never invoke the actual chat use-case, which would bill a
  // real LLM call and write a synthetic AiRequestLog row on every page load.
  @UseGuards(PermissionsGuard)
  @RequirePermissions("report:view")
  @Get("status")
  status() {
    const provider = this.aiProviderFactory.get();
    return { configured: provider.configured, provider: provider.provider };
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
