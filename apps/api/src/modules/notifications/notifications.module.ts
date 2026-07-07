import { Module } from "@nestjs/common";
import { BookingCancelledListener } from "./application/booking-cancelled.listener";
import { BookingConfirmedListener } from "./application/booking-confirmed.listener";
import { CreateNotificationUseCase } from "./application/create-notification.use-case";
import { ListMyNotificationsUseCase } from "./application/list-my-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/mark-notification-read.use-case";
import { PaymentSucceededListener } from "./application/payment-succeeded.listener";
import { CUSTOMER_CONTACT_RESOLVER } from "./domain/customer-contact-resolver";
import { EMAIL_SENDER } from "./domain/email-sender";
import { NOTIFICATION_REPOSITORY } from "./domain/notification.repository";
import { PrismaCustomerContactResolver } from "./infrastructure/prisma-customer-contact-resolver";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { ResendEmailSender } from "./infrastructure/resend-email-sender";
import { NotificationsController } from "./notifications.controller";

@Module({
  controllers: [NotificationsController],
  providers: [
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    CreateNotificationUseCase,
    PaymentSucceededListener,
    BookingConfirmedListener,
    BookingCancelledListener,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: CUSTOMER_CONTACT_RESOLVER, useClass: PrismaCustomerContactResolver },
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
  ],
})
export class NotificationsModule {}
