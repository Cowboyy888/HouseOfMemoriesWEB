import { Body, Controller, Get, Inject, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  CancelBookingRequestSchema,
  CheckAvailabilityQuerySchema,
  CreateBookingRequestSchema,
  BookingListQuerySchema,
  type BookingListQuery,
  type CancelBookingRequest,
  type CheckAvailabilityQuery,
  type CreateBookingRequest,
} from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { CancelBookingUseCase } from "./application/cancel-booking.use-case";
import { CheckAvailabilityUseCase } from "./application/check-availability.use-case";
import { ConfirmBookingUseCase } from "./application/confirm-booking.use-case";
import { CreateBookingUseCase } from "./application/create-booking.use-case";
import { GetBookingUseCase } from "./application/get-booking.use-case";
import { ListMyBookingsUseCase } from "./application/list-my-bookings.use-case";

@Controller("bookings")
@UseGuards(PermissionsGuard)
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getBookingUseCase: GetBookingUseCase,
    private readonly listMyBookingsUseCase: ListMyBookingsUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly confirmBookingUseCase: ConfirmBookingUseCase,
    private readonly checkAvailabilityUseCase: CheckAvailabilityUseCase,
    @Inject(CUSTOMER_PROFILE_RESOLVER) private readonly customerProfiles: CustomerProfileResolver,
  ) {}

  @Get("availability")
  checkAvailability(@Query(new ZodValidationPipe(CheckAvailabilityQuerySchema)) query: CheckAvailabilityQuery) {
    return this.checkAvailabilityUseCase.execute(query);
  }

  @Post()
  @RequirePermissions("booking:create")
  async create(
    @Body(new ZodValidationPipe(CreateBookingRequestSchema)) body: CreateBookingRequest,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.createBookingUseCase.execute(body, profile.id);
  }

  @Get("mine")
  @RequirePermissions("booking:read")
  async listMine(
    @Query(new ZodValidationPipe(BookingListQuerySchema)) query: BookingListQuery,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.listMyBookingsUseCase.execute(profile.id, query);
  }

  @Post(":id/confirm")
  @RequirePermissions("booking:update")
  confirm(@Param("id") id: string) {
    return this.confirmBookingUseCase.execute(id);
  }

  @Post(":id/cancel")
  @RequirePermissions("booking:cancel")
  async cancel(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(CancelBookingRequestSchema)) body: CancelBookingRequest,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.cancelBookingUseCase.execute(id, profile.id, body.reason);
  }

  @Get(":id")
  @RequirePermissions("booking:read")
  async get(@Param("id") id: string, @CurrentUser() user: { id: string } | null) {
    const profile = await this.requireCustomerProfile(user);
    return this.getBookingUseCase.execute(id, profile.id);
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
