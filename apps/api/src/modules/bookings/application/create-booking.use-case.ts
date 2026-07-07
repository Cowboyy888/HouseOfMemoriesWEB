import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { BookingResult, CreateBookingRequest } from "@drivehub/contracts";
import {
  BOOKING_REPOSITORY,
  BookingOverlapError,
  type BookingRepository,
} from "../domain/booking.repository";
import { CAR_AVAILABILITY_REPOSITORY, type CarAvailabilityRepository } from "../domain/car-availability.repository";
import { PRICING_RULE_REPOSITORY, type PricingRuleRepository } from "../domain/pricing-rule.repository";
import { computeNightCount, resolveDailyRate } from "../domain/pricing-rule-resolver";
import { toBookingResult } from "./booking.mapper";

// Deposit policy remains a flat percentage — formalizing it (per-category
// rates, minimum deposits) would need new schema surface (no
// DepositPolicy model or CarCategory.depositPercentage field exists), which
// is a bigger step than wiring up the PricingRule model this module does
// use. Isolated as a named constant so that future model/field can replace
// it without touching the rest of this use-case.
const DEPOSIT_PERCENTAGE = 0.2;

function generateBookingNumber(): string {
  return `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
}

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository,
    @Inject(CAR_AVAILABILITY_REPOSITORY) private readonly carAvailability: CarAvailabilityRepository,
    @Inject(PRICING_RULE_REPOSITORY) private readonly pricingRules: PricingRuleRepository,
  ) {}

  async execute(request: CreateBookingRequest, customerId: string): Promise<BookingResult> {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    if (startDate.getTime() < Date.now()) {
      throw new BadRequestException("startDate cannot be in the past");
    }

    const car = await this.carAvailability.findRentableCar(request.carId);
    if (!car) {
      throw new NotFoundException(`Car ${request.carId} is not available for rental`);
    }

    const hasOverlap = await this.carAvailability.hasOverlap(request.carId, startDate, endDate);
    if (hasOverlap) {
      throw new ConflictException("This car is already booked or blocked for part of the selected dates");
    }

    const days = computeNightCount(startDate, endDate);
    const applicableRules = await this.pricingRules.findApplicable(car.id, car.categoryId, startDate, endDate, days);
    const dailyRate = resolveDailyRate(car.dailyRentalRate, applicableRules, startDate, days);
    const totalAmount = Math.round(dailyRate * days * 100) / 100;
    const depositAmount = Math.round(totalAmount * DEPOSIT_PERCENTAGE * 100) / 100;

    try {
      const booking = await this.bookings.create({
        bookingNumber: generateBookingNumber(),
        customerId,
        carId: request.carId,
        pickupLocationId: request.pickupLocationId,
        dropoffLocationId: request.dropoffLocationId,
        startDate,
        endDate,
        dailyRate,
        totalAmount,
        depositAmount,
      });
      return toBookingResult(booking);
    } catch (error) {
      // The app-level hasOverlap() check above already caught the common
      // case — this only fires on a genuine race between two concurrent
      // requests for the same car/date range, which the DB's exclusion
      // constraint is the actual backstop for.
      if (error instanceof BookingOverlapError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
