import { Injectable } from "@nestjs/common";
import type { Prisma } from "@drivehub/database";
import { PrismaService } from "../../../shared/database/prisma.service";
import type {
  CreateNotificationRecordInput,
  NotificationEntity,
  NotificationListFilters,
  NotificationListResult,
  NotificationRepository,
} from "../domain/notification.repository";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationRecordInput): Promise<NotificationEntity> {
    return this.prisma.client.notification.create({
      data: {
        customerId: input.customerId,
        type: input.type,
        title: input.title,
        body: input.body,
        relatedBookingId: input.relatedBookingId,
        relatedPaymentId: input.relatedPaymentId,
        relatedInvoiceId: input.relatedInvoiceId,
      },
    });
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    return this.prisma.client.notification.findUnique({ where: { id } });
  }

  async findMany(filters: NotificationListFilters): Promise<NotificationListResult> {
    const where: Prisma.NotificationWhereInput = {
      customerId: filters.customerId,
      ...(filters.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.client.notification.count({ where }),
      this.prisma.client.notification.count({ where: { customerId: filters.customerId, readAt: null } }),
    ]);

    return { items, total, unreadCount, page: filters.page, pageSize: filters.pageSize };
  }

  async markRead(id: string): Promise<NotificationEntity> {
    return this.prisma.client.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
}
