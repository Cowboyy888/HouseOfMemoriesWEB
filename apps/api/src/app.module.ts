import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    // Global default: 60 requests/minute per IP. Individual routes (e.g. the
    // unauthenticated, LLM-billed AI endpoints) apply a stricter @Throttle
    // override on top of this — see ai.controller.ts.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 60 }]),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Express 5 / path-to-regexp v6+ requires a named wildcard, not a bare "*".
    consumer.apply(SessionMiddleware).forRoutes("*path");
  }
}
