import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { CancelBookingUseCase } from "./application/cancel-booking.use-case";
import { CheckAvailabilityUseCase } from "./application/check-availability.use-case";
import { ConfirmBookingUseCase } from "./application/confirm-booking.use-case";
import { CreateBookingUseCase } from "./application/create-booking.use-case";
import { GetBookingUseCase } from "./application/get-booking.use-case";
import { ListMyBookingsUseCase } from "./application/list-my-bookings.use-case";
import { PaymentSucceededListener } from "./application/payment-succeeded.listener";
import { BOOKING_REPOSITORY } from "./domain/booking.repository";
import { CAR_AVAILABILITY_REPOSITORY } from "./domain/car-availability.repository";
import { PRICING_RULE_REPOSITORY } from "./domain/pricing-rule.repository";
import { PrismaBookingRepository } from "./infrastructure/prisma-booking.repository";
import { PrismaCarAvailabilityRepository } from "./infrastructure/prisma-car-availability.repository";
import { PrismaPricingRuleRepository } from "./infrastructure/prisma-pricing-rule.repository";

@Module({
  controllers: [BookingsController],
  providers: [
    CreateBookingUseCase,
    GetBookingUseCase,
    ListMyBookingsUseCase,
    CancelBookingUseCase,
    ConfirmBookingUseCase,
    CheckAvailabilityUseCase,
    PaymentSucceededListener,
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
    { provide: CAR_AVAILABILITY_REPOSITORY, useClass: PrismaCarAvailabilityRepository },
    { provide: PRICING_RULE_REPOSITORY, useClass: PrismaPricingRuleRepository },
  ],
})
export class BookingsModule {}
