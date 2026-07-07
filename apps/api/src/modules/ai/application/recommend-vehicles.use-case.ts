import { Inject, Injectable } from "@nestjs/common";
import type { RecommendationQuery, RecommendationResult } from "@drivehub/contracts";
import { rankCars, type RecommendationCriteria } from "../domain/recommendation-engine";
import {
  RECOMMENDATION_CONTEXT_REPOSITORY,
  type RecommendationContextRepository,
} from "../domain/recommendation-context.repository";
import { AI_REQUEST_LOG_REPOSITORY, type AiRequestLogRepository } from "../domain/ai-request-log.repository";

@Injectable()
export class RecommendVehiclesUseCase {
  constructor(
    @Inject(RECOMMENDATION_CONTEXT_REPOSITORY) private readonly context: RecommendationContextRepository,
    @Inject(AI_REQUEST_LOG_REPOSITORY) private readonly logs: AiRequestLogRepository,
  ) {}

  async execute(query: RecommendationQuery, customerId: string | null): Promise<RecommendationResult> {
    const startedAt = Date.now();
    const criteria: RecommendationCriteria = {
      budget: query.budget ?? null,
      passengerCount: query.passengerCount ?? null,
      categorySlug: query.categorySlug ?? null,
      fuelType: query.fuelType ?? null,
    };

    const [cars, affinity] = await Promise.all([
      this.context.findCandidateCars(),
      customerId ? this.context.findCustomerAffinity(customerId) : Promise.resolve({ brandNames: [], categorySlugs: [] }),
    ]);

    const ranked = rankCars(cars, criteria, affinity).filter((car) => car.score > 0);
    const top = ranked.slice(0, query.limit);

    await this.logs.create({
      module: "RECOMMENDATION",
      provider: null,
      customerId,
      promptSummary: JSON.stringify(criteria),
      responseSummary: `${top.length} of ${cars.length} candidates scored > 0`,
      succeeded: true,
      escalated: false,
      errorMessage: null,
      latencyMs: Date.now() - startedAt,
    });

    return {
      items: top.map((car) => ({
        carId: car.id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        dailyRentalRate: car.dailyRentalRate.toFixed(2),
        score: car.score,
        reasons: car.reasons,
      })),
    };
  }
}
