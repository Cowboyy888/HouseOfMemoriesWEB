import type { CandidateCar, CustomerAffinity } from "./recommendation-engine";

export const RECOMMENDATION_CONTEXT_REPOSITORY = Symbol("RECOMMENDATION_CONTEXT_REPOSITORY");

export interface RecommendationContextRepository {
  findCandidateCars(): Promise<CandidateCar[]>;
  findCustomerAffinity(customerId: string): Promise<CustomerAffinity>;
}
