import { Controller, Get, Inject, NotFoundException, Param, Query, UseGuards } from "@nestjs/common";
import { InvoiceListQuerySchema, type InvoiceListQuery } from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { GetInvoiceUseCase } from "./application/get-invoice.use-case";
import { ListMyInvoicesUseCase } from "./application/list-my-invoices.use-case";

@Controller("invoices")
@UseGuards(PermissionsGuard)
export class InvoicesController {
  constructor(
    private readonly getInvoiceUseCase: GetInvoiceUseCase,
    private readonly listMyInvoicesUseCase: ListMyInvoicesUseCase,
    @Inject(CUSTOMER_PROFILE_RESOLVER) private readonly customerProfiles: CustomerProfileResolver,
  ) {}

  @Get("mine")
  @RequirePermissions("invoice:read")
  async listMine(
    @Query(new ZodValidationPipe(InvoiceListQuerySchema)) query: InvoiceListQuery,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.listMyInvoicesUseCase.execute(profile.id, query);
  }

  @Get(":id")
  @RequirePermissions("invoice:read")
  async get(@Param("id") id: string, @CurrentUser() user: { id: string } | null) {
    const profile = await this.requireCustomerProfile(user);
    return this.getInvoiceUseCase.execute(id, profile.id);
  }

  private async requireCustomerProfile(user: { id: string } | null) {
    if (!user) {
      throw new NotFoundException("No customer profile for the current session");
    }
    const profile = await this.customerProfiles.resolveByUserId(user.id);
    if (!profile) {
      throw new NotFoundException("No customer profile for the current session");
    }
    return profile;
  }
}
