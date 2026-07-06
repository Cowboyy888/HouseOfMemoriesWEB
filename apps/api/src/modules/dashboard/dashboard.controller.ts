import { Controller, Get, UseGuards } from "@nestjs/common";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { GetExecutiveSummaryUseCase } from "./application/get-executive-summary.use-case";

@Controller("dashboard")
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private readonly getExecutiveSummaryUseCase: GetExecutiveSummaryUseCase) {}

  @Get("executive-summary")
  @RequirePermissions("report:view")
  async executiveSummary() {
    return this.getExecutiveSummaryUseCase.execute();
  }
}
