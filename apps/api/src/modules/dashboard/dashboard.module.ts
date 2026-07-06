import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { GetExecutiveSummaryUseCase } from "./application/get-executive-summary.use-case";
import { DASHBOARD_REPOSITORY } from "./domain/dashboard.repository";
import { PrismaDashboardRepository } from "./infrastructure/prisma-dashboard.repository";

@Module({
  controllers: [DashboardController],
  providers: [
    GetExecutiveSummaryUseCase,
    { provide: DASHBOARD_REPOSITORY, useClass: PrismaDashboardRepository },
  ],
})
export class DashboardModule {}
