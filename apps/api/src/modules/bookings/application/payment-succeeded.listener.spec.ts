import { describe, expect, it, vi } from "vitest";
import type { PaymentSucceededEvent } from "../../../shared/events/payment-succeeded.event";
import type { ConfirmBookingUseCase } from "./confirm-booking.use-case";
import { PaymentSucceededListener } from "./payment-succeeded.listener";

function makeEvent(overrides: Partial<PaymentSucceededEvent> = {}): PaymentSucceededEvent {
  return {
    paymentId: "payment-1",
    customerId: "customer-1",
    amount: 65,
    bookingId: "booking-1",
    saleTransactionId: null,
    paymentScheduleId: null,
    description: "Booking deposit — Payment PAYMENT1",
    ...overrides,
  };
}

describe("PaymentSucceededListener (bookings)", () => {
  it("confirms the booking tied to the payment", async () => {
    const confirmBookingUseCase = { execute: vi.fn() } as unknown as ConfirmBookingUseCase;
    const listener = new PaymentSucceededListener(confirmBookingUseCase);

    await listener.handle(makeEvent());

    expect(confirmBookingUseCase.execute).toHaveBeenCalledWith("booking-1");
  });

  it("does not blow up when there's no bookingId on the event", async () => {
    const confirmBookingUseCase = { execute: vi.fn() } as unknown as ConfirmBookingUseCase;
    const listener = new PaymentSucceededListener(confirmBookingUseCase);

    await expect(listener.handle(makeEvent({ bookingId: null }))).resolves.toBeUndefined();
    expect(confirmBookingUseCase.execute).not.toHaveBeenCalled();
  });

  it("swallows a thrown error instead of letting it propagate out of the listener", async () => {
    const confirmBookingUseCase = {
      execute: vi.fn().mockRejectedValue(new Error("booking confirm blew up")),
    } as unknown as ConfirmBookingUseCase;
    const listener = new PaymentSucceededListener(confirmBookingUseCase);

    // If this listener's failure isn't isolated, emitAsync's Promise.all
    // would reject and mask the outcome of the Invoices/Notifications
    // listeners too (Fix 1 — see handle-payment-success.use-case.ts).
    await expect(listener.handle(makeEvent())).resolves.toBeUndefined();
  });
});
