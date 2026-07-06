import { Inject, Injectable } from "@nestjs/common";
import type { ExecutiveSummary } from "@drivehub/contracts";
import { DASHBOARD_REPOSITORY, type DashboardRepository } from "../domain/dashboard.repository";

@Injectable()
export class GetExecutiveSummaryUseCase {
  constructor(@Inject(DASHBOARD_REPOSITORY) private readonly dashboardRepository: DashboardRepository) {}

  async execute(): Promise<ExecutiveSummary> {
    return this.dashboardRepository.getExecutiveSummary();
  }
}
