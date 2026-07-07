import { describe, expect, it, vi } from "vitest";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, type Booking } from "@drivehub/database";
import { BOOKING_CONFIRMED_EVENT } from "../../../shared/events/booking-confirmed.event";
import type { BookingRepository } from "../domain/booking.repository";
import { ConfirmBookingUseCase } from "./confirm-booking.use-case";

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

describe("ConfirmBookingUseCase", () => {
  it("throws NotFoundException when the booking doesn't exist", async () => {
    const bookings = { findById: vi.fn().mockResolvedValue(null) } as unknown as BookingRepository;
    const useCase = new ConfirmBookingUseCase(bookings, makeEvents());

    await expect(useCase.execute("missing")).rejects.toThrow(/was not found/);
  });

  it("is a no-op and does not re-emit BookingConfirmedEvent when already CONFIRMED", async () => {
    const bookings = { findById: vi.fn().mockResolvedValue(makeBooking({ status: "CONFIRMED" })), updateStatus: vi.fn() } as unknown as BookingRepository;
    const events = makeEvents();
    const useCase = new ConfirmBookingUseCase(bookings, events);

    const result = await useCase.execute("booking-1");

    expect(result.status).toBe("CONFIRMED");
    expect(bookings.updateStatus).not.toHaveBeenCalled();
    expect(events.emitAsync).not.toHaveBeenCalled();
  });

  it("rejects confirming a booking that isn't PENDING or already CONFIRMED", async () => {
    const bookings = { findById: vi.fn().mockResolvedValue(makeBooking({ status: "CANCELLED" })) } as unknown as BookingRepository;
    const useCase = new ConfirmBookingUseCase(bookings, makeEvents());

    await expect(useCase.execute("booking-1")).rejects.toThrow(/Only a PENDING booking/);
  });

  it("confirms a PENDING booking and emits BookingConfirmedEvent", async () => {
    const confirmed = makeBooking({ status: "CONFIRMED" });
    const bookings = {
      findById: vi.fn().mockResolvedValue(makeBooking({ status: "PENDING" })),
      updateStatus: vi.fn().mockResolvedValue(confirmed),
    } as unknown as BookingRepository;
    const events = makeEvents();
    const useCase = new ConfirmBookingUseCase(bookings, events);

    const result = await useCase.execute("booking-1");

    expect(bookings.updateStatus).toHaveBeenCalledWith("booking-1", "CONFIRMED");
    expect(events.emitAsync).toHaveBeenCalledWith(
      BOOKING_CONFIRMED_EVENT,
      expect.objectContaining({ bookingId: "booking-1", customerId: "customer-1", bookingNumber: "BK-TEST0001" }),
    );
    expect(result.status).toBe("CONFIRMED");
  });
});
