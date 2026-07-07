import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DatabaseModule } from "./shared/database/database.module";
import { CustomerModule } from "./shared/customer/customer.module";
import { SessionMiddleware } from "./shared/auth/session.middleware";
import { CarsModule } from "./modules/cars/cars.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AiModule } from "./modules/ai/ai.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    CustomerModule,
    CarsModule,
    DashboardModule,
    PaymentsModule,
    BookingsModule,
    InvoicesModule,
    NotificationsModule,
    AiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Express 5 / path-to-regexp v6+ requires a named wildcard, not a bare "*".
    consumer.apply(SessionMiddleware).forRoutes("*path");
  }
}
