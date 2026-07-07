import { describe, expect, it, vi } from "vitest";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, type Booking } from "@drivehub/database";
import { BOOKING_CANCELLED_EVENT } from "../../../shared/events/booking-cancelled.event";
import type { BookingRepository } from "../domain/booking.repository";
import { CancelBookingUseCase } from "./cancel-booking.use-case";

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    bookingNumber: "BK-TEST0001",
    customerId: "customer-1",
    carId: "car-1",
    pickupLocationId: "loc-1",
    dropoffLocationId: "loc-1",
    startDate: new Date(),
    endDate: new Date(),
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

function makeEvents(): EventEmitter2 {
  return { emitAsync: vi.fn() } as unknown as EventEmitter2;
}

describe("CancelBookingUseCase", () => {
  it("throws NotFoundException when the booking doesn't exist", async () => {
    const bookings = { findById: vi.fn().mockResolvedValue(null) } as unknown as BookingRepository;
    const useCase = new CancelBookingUseCase(bookings, makeEvents());

    await expect(useCase.execute("missing", "customer-1", "reason")).rejects.toThrow(/was not found/);
  });

  it("throws ForbiddenException when a different customer tries to cancel", async () => {
    const bookings = { findById: vi.fn().mockResolvedValue(makeBooking()) } as unknown as BookingRepository;
    const useCase = new CancelBookingUseCase(bookings, makeEvents());

    await expect(useCase.execute("booking-1", "someone-else", "reason")).rejects.toThrow(/your own bookings/);
  });

  it.each(["ACTIVE", "COMPLETED", "CANCELLED", "NO_SHOW"] as const)(
    "rejects cancelling a booking with status %s",
    async (status) => {
      const bookings = { findById: vi.fn().mockResolvedValue(makeBooking({ status })) } as unknown as BookingRepository;
      const useCase = new CancelBookingUseCase(bookings, makeEvents());

      await expect(useCase.execute("booking-1", "customer-1", "reason")).rejects.toThrow(/can no longer be cancelled/);
    },
  );

  it("cancels a PENDING booking and emits BookingCancelledEvent with the reason", async () => {
    const cancelled = makeBooking({ status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Changed my mind" });
    const bookings = {
      findById: vi.fn().mockResolvedValue(makeBooking({ status: "PENDING" })),
      cancel: vi.fn().mockResolvedValue(cancelled),
    } as unknown as BookingRepository;
    const events = makeEvents();
    const useCase = new CancelBookingUseCase(bookings, events);

    const result = await useCase.execute("booking-1", "customer-1", "Changed my mind");

    expect(bookings.cancel).toHaveBeenCalledWith("booking-1", "Changed my mind");
    expect(events.emitAsync).toHaveBeenCalledWith(
      BOOKING_CANCELLED_EVENT,
      expect.objectContaining({ bookingId: "booking-1", customerId: "customer-1", reason: "Changed my mind" }),
    );
    expect(result.status).toBe("CANCELLED");
  });
});
