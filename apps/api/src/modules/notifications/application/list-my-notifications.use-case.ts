import { Inject, Injectable } from "@nestjs/common";
import type { NotificationListQuery, NotificationListResult } from "@drivehub/contracts";
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from "../domain/notification.repository";
import { toNotificationResult } from "./notification.mapper";

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  async execute(customerId: string, query: NotificationListQuery): Promise<NotificationListResult> {
    const result = await this.notifications.findMany({
      customerId,
      unreadOnly: query.unreadOnly,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: result.items.map(toNotificationResult),
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
