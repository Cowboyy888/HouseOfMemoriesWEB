import { describe, expect, it, vi } from "vitest";
import type { CreateBookingRequest } from "@drivehub/contracts";
import { Prisma, type Booking } from "@drivehub/database";
import { BookingOverlapError, type BookingRepository } from "../domain/booking.repository";
import type { CarAvailabilityRepository } from "../domain/car-availability.repository";
import type { ApplicablePricingRule, PricingRuleRepository } from "../domain/pricing-rule.repository";
import { CreateBookingUseCase } from "./create-booking.use-case";

const request: CreateBookingRequest = {
  carId: "car-1",
  pickupLocationId: "loc-1",
  dropoffLocationId: "loc-1",
  startDate: "2027-01-10T00:00:00.000Z",
  endDate: "2027-01-15T00:00:00.000Z",
};

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    bookingNumber: "BK-TEST0001",
    customerId: "customer-1",
    carId: "car-1",
    pickupLocationId: "loc-1",
    dropoffLocationId: "loc-1",
    startDate: new Date(request.startDate),
    endDate: new Date(request.endDate),
    actualPickupAt: null,
    actualReturnAt: null,
    status: "PENDING",
    dailyRate: new Prisma.Decimal(65),
    totalAmount: new Prisma.Decimal(325),
    depositAmount: new Prisma.Decimal(65),
    currency: "USD",
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCarAvailability(overrides: Partial<{ hasOverlap: boolean; car: unknown }> = {}) {
  return {
    findRentableCar: vi.fn().mockResolvedValue(overrides.car ?? { id: "car-1", categoryId: "category-1", dailyRentalRate: 65 }),
    hasOverlap: vi.fn().mockResolvedValue(overrides.hasOverlap ?? false),
  } as unknown as CarAvailabilityRepository;
}

function makePricingRules(rules: ApplicablePricingRule[] = []): PricingRuleRepository {
  return { findApplicable: vi.fn().mockResolvedValue(rules) } as unknown as PricingRuleRepository;
}

describe("CreateBookingUseCase", () => {
  it("rejects a startDate in the past", async () => {
    const useCase = new CreateBookingUseCase({} as BookingRepository, {} as CarAvailabilityRepository, makePricingRules());

    await expect(
      useCase.execute({ ...request, startDate: "2020-01-01T00:00:00.000Z" }, "customer-1"),
    ).rejects.toThrow(/cannot be in the past/);
  });

  it("throws NotFoundException when the car isn't rentable", async () => {
    const carAvailability = { findRentableCar: vi.fn().mockResolvedValue(null) } as unknown as CarAvailabilityRepository;
    const useCase = new CreateBookingUseCase({} as BookingRepository, carAvailability, makePricingRules());

    await expect(useCase.execute(request, "customer-1")).rejects.toThrow(/not available for rental/);
  });

  it("throws ConflictException when the app-level overlap check finds a conflict", async () => {
    const carAvailability = makeCarAvailability({ hasOverlap: true });
    const useCase = new CreateBookingUseCase({} as BookingRepository, carAvailability, makePricingRules());

    await expect(useCase.execute(request, "customer-1")).rejects.toThrow(/already booked or blocked/);
  });

  it("computes total and deposit from the daily rate and day count when no pricing rules apply", async () => {
    const carAvailability = makeCarAvailability();
    const create = vi.fn().mockResolvedValue(makeBooking());
    const bookings = { create } as unknown as BookingRepository;

    const useCase = new CreateBookingUseCase(bookings, carAvailability, makePricingRules());
    await useCase.execute(request, "customer-1");

    // 2027-01-10 -> 2027-01-15 is 5 days at $65/day = $325 total, 20% deposit = $65.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "customer-1", dailyRate: 65, totalAmount: 325, depositAmount: 65 }),
    );
  });

  it("applies a car-specific BASE rule's flatRate in place of the car's list price", async () => {
    const carAvailability = makeCarAvailability();
    const create = vi.fn().mockResolvedValue(makeBooking());
    const bookings = { create } as unknown as BookingRepository;
    const pricingRules = makePricingRules([
      { ruleType: "BASE", isCarSpecific: true, multiplier: null, flatRate: 80, priority: 1 },
    ]);

    const useCase = new CreateBookingUseCase(bookings, carAvailability, pricingRules);
    await useCase.execute(request, "customer-1");

    // 5 days at the overridden $80/day = $400 total, 20% deposit = $80.
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ dailyRate: 80, totalAmount: 400, depositAmount: 80 }));
  });

  it("compounds a SEASONAL multiplier onto the base rate", async () => {
    const carAvailability = makeCarAvailability();
    const create = vi.fn().mockResolvedValue(makeBooking());
    const bookings = { create } as unknown as BookingRepository;
    const pricingRules = makePricingRules([
      { ruleType: "SEASONAL", isCarSpecific: false, multiplier: 1.5, flatRate: null, priority: 1 },
    ]);

    const useCase = new CreateBookingUseCase(bookings, carAvailability, pricingRules);
    await useCase.execute(request, "customer-1");

    // $65 * 1.5 = $97.50/day * 5 days = $487.50 total.
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ dailyRate: 97.5, totalAmount: 487.5 }));
  });

  it("translates a BookingOverlapError from the repository (the race-condition backstop) into a ConflictException", async () => {
    const carAvailability = makeCarAvailability();
    const bookings = { create: vi.fn().mockRejectedValue(new BookingOverlapError()) } as unknown as BookingRepository;

    const useCase = new CreateBookingUseCase(bookings, carAvailability, makePricingRules());

    await expect(useCase.execute(request, "customer-1")).rejects.toThrow(/no longer available/);
  });
});
