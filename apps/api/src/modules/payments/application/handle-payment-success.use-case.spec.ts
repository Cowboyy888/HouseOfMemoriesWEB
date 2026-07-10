import { describe, expect, it, vi } from "vitest";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@drivehub/database";
import { PAYMENT_SUCCEEDED_EVENT } from "../../../shared/events/payment-succeeded.event";
import type { InstallmentScheduleRepository } from "../domain/installment-schedule.repository";
import type { PaymentEntity } from "../domain/payment.repository";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return {
    id: "payment-1",
    amount: new Prisma.Decimal(65),
    currency: "USD",
    method: "BANK_TRANSFER",
    provider: "STRIPE",
    providerPaymentId: "pi_123",
    providerMetadata: null,
    status: "SUCCEEDED",
    bookingId: "booking-1",
    saleTransactionId: null,
    paymentScheduleId: null,
    paidByCustomerId: "customer-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    refunds: [],
    ...overrides,
  };
}

describe("HandlePaymentSuccessUseCase", () => {
  it("credits the installment schedule when the payment belongs to one", async () => {
    const schedules = { recordPayment: vi.fn() } as unknown as InstallmentScheduleRepository;
    const events = { emitAsync: vi.fn() } as unknown as EventEmitter2;
    const useCase = new HandlePaymentSuccessUseCase(schedules, events);
    const payment = makePayment({ paymentScheduleId: "schedule-1", amount: new Prisma.Decimal(50) });

    await useCase.execute(payment);

    expect(schedules.recordPayment).toHaveBeenCalledWith("schedule-1", 50);
  });

  it("skips crediting a schedule when the payment isn't tied to one", async () => {
    const schedules = { recordPayment: vi.fn() } as unknown as InstallmentScheduleRepository;
    const events = { emitAsync: vi.fn() } as unknown as EventEmitter2;
    const useCase = new HandlePaymentSuccessUseCase(schedules, events);

    await useCase.execute(makePayment({ paymentScheduleId: null }));

    expect(schedules.recordPayment).not.toHaveBeenCalled();
  });

  it("emits PaymentSucceededEvent with a DTO derived from the payment", async () => {
    const schedules = { recordPayment: vi.fn() } as unknown as InstallmentScheduleRepository;
    const events = { emitAsync: vi.fn() } as unknown as EventEmitter2;
    const useCase = new HandlePaymentSuccessUseCase(schedules, events);
    const payment = makePayment({ bookingId: "booking-1", amount: new Prisma.Decimal(65) });

    await useCase.execute(payment);

    expect(events.emitAsync).toHaveBeenCalledWith(
      PAYMENT_SUCCEEDED_EVENT,
      expect.objectContaining({
        paymentId: "payment-1",
        customerId: "customer-1",
        amount: 65,
        bookingId: "booking-1",
        saleTransactionId: null,
        paymentScheduleId: null,
      }),
    );
  });

  it("propagates emitAsync rejections to its own caller (webhook reconciliation, verify, etc.)", async () => {
    const schedules = { recordPayment: vi.fn() } as unknown as InstallmentScheduleRepository;
    const events = { emitAsync: vi.fn().mockRejectedValue(new Error("a listener blew up")) } as unknown as EventEmitter2;
    const useCase = new HandlePaymentSuccessUseCase(schedules, events);

    await expect(useCase.execute(makePayment())).rejects.toThrow("a listener blew up");
  });
});
