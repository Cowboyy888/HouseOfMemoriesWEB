import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./shared/database/database.module";
import { SessionMiddleware } from "./shared/auth/session.middleware";
import { CarsModule } from "./modules/cars/cars.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, CarsModule, DashboardModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Express 5 / path-to-regexp v6+ requires a named wildcard, not a bare "*".
    consumer.apply(SessionMiddleware).forRoutes("*path");
  }
}
