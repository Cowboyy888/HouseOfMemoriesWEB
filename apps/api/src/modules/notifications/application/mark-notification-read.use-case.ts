import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationResult } from "@drivehub/contracts";
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from "../domain/notification.repository";
import { toNotificationResult } from "./notification.mapper";

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  async execute(notificationId: string, requestingCustomerId: string): Promise<NotificationResult> {
    const notification = await this.notifications.findById(notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} was not found`);
    }
    if (notification.customerId !== requestingCustomerId) {
      throw new ForbiddenException("You can only mark your own notifications as read");
    }
    if (notification.readAt) {
      return toNotificationResult(notification);
    }

    const updated = await this.notifications.markRead(notificationId);
    return toNotificationResult(updated);
  }
}
