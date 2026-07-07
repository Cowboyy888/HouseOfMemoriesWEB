import { Body, Controller, Get, Inject, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { CreatePaymentRequestSchema, CreateRefundRequestSchema, type CreatePaymentRequest, type CreateRefundRequest } from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { ConfirmManualPaymentUseCase } from "./application/confirm-manual-payment.use-case";
import { CreatePaymentUseCase } from "./application/create-payment.use-case";
import { CreateRefundUseCase } from "./application/create-refund.use-case";
import { GetPaymentUseCase } from "./application/get-payment.use-case";
import { VerifyPaymentUseCase } from "./application/verify-payment.use-case";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";

@Controller("payments")
@UseGuards(PermissionsGuard)
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly createRefundUseCase: CreateRefundUseCase,
    private readonly confirmManualPaymentUseCase: ConfirmManualPaymentUseCase,
    @Inject(CUSTOMER_PROFILE_RESOLVER) private readonly customerProfiles: CustomerProfileResolver,
  ) {}

  @Post()
  @RequirePermissions("payment:create")
  async create(
    @Body(new ZodValidationPipe(CreatePaymentRequestSchema)) body: CreatePaymentRequest,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.createPaymentUseCase.execute(body, profile);
  }

  @Get(":id")
  @RequirePermissions("payment:read")
  async get(@Param("id") id: string, @CurrentUser() user: { id: string } | null) {
    const profile = await this.requireCustomerProfile(user);
    return this.getPaymentUseCase.execute(id, profile.id);
  }

  @Post(":id/verify")
  @RequirePermissions("payment:read")
  async verify(@Param("id") id: string, @CurrentUser() user: { id: string } | null) {
    // Ownership is enforced by re-fetching through GetPaymentUseCase's check
    // first — verify() itself only reconciles against the provider, it
    // doesn't gate access.
    const profile = await this.requireCustomerProfile(user);
    await this.getPaymentUseCase.execute(id, profile.id);
    return this.verifyPaymentUseCase.execute(id);
  }

  @Post(":id/refunds")
  @RequirePermissions("payment:refund")
  refund(@Param("id") id: string, @Body(new ZodValidationPipe(CreateRefundRequestSchema)) body: CreateRefundRequest) {
    // Staff-only — no ownership check, since only staff roles hold
    // payment:refund (mirrors ConfirmBookingUseCase's confirm endpoint).
    return this.createRefundUseCase.execute(id, body);
  }

  @Post(":id/confirm-manual")
  @RequirePermissions("payment:update")
  confirmManual(@Param("id") id: string) {
    // Staff-only — no ownership check, same pattern as refund/booking confirm.
    return this.confirmManualPaymentUseCase.execute(id);
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
