import { Controller, Get, Inject, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import { NotificationListQuerySchema, type NotificationListQuery } from "@drivehub/contracts";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { PermissionsGuard } from "../../shared/auth/permissions.guard";
import { RequirePermissions } from "../../shared/auth/require-permissions.decorator";
import { CUSTOMER_PROFILE_RESOLVER, type CustomerProfileResolver } from "../../shared/customer/customer-profile-resolver";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { ListMyNotificationsUseCase } from "./application/list-my-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/mark-notification-read.use-case";

@Controller("notifications")
@UseGuards(PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly listMyNotificationsUseCase: ListMyNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    @Inject(CUSTOMER_PROFILE_RESOLVER) private readonly customerProfiles: CustomerProfileResolver,
  ) {}

  @Get("mine")
  @RequirePermissions("notification:read")
  async listMine(
    @Query(new ZodValidationPipe(NotificationListQuerySchema)) query: NotificationListQuery,
    @CurrentUser() user: { id: string } | null,
  ) {
    const profile = await this.requireCustomerProfile(user);
    return this.listMyNotificationsUseCase.execute(profile.id, query);
  }

  @Post(":id/read")
  @RequirePermissions("notification:read")
  async markRead(@Param("id") id: string, @CurrentUser() user: { id: string } | null) {
    const profile = await this.requireCustomerProfile(user);
    return this.markNotificationReadUseCase.execute(id, profile.id);
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
