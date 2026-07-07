import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@drivehub/database";
import type { PaymentProviderPort, PaymentProviderRegistry, RefundPaymentOutput } from "../domain/payment-provider.port";
import type { PaymentEntity, PaymentRepository } from "../domain/payment.repository";
import type { RefundEntity, RefundRepository } from "../domain/refund.repository";
import { CreateRefundUseCase } from "./create-refund.use-case";

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

function makeRefund(overrides: Partial<RefundEntity> = {}): RefundEntity {
  return {
    id: "refund-1",
    paymentId: "payment-1",
    amount: new Prisma.Decimal(20),
    reason: "test",
    status: "PROCESSED",
    providerRefundId: "re_123",
    processedByEmployeeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProvider(refundResult: RefundPaymentOutput): PaymentProviderPort {
  return {
    provider: "STRIPE",
    createPayment: vi.fn(),
    verifyPayment: vi.fn(),
    refundPayment: vi.fn().mockResolvedValue(refundResult),
  };
}

describe("CreateRefundUseCase", () => {
  it("throws NotFoundException when the payment doesn't exist", async () => {
    const payments = { findById: vi.fn().mockResolvedValue(null) } as unknown as PaymentRepository;
    const useCase = new CreateRefundUseCase(payments, {} as RefundRepository, {} as PaymentProviderRegistry);

    await expect(useCase.execute("missing", { amount: 10, reason: "x" })).rejects.toThrow(/was not found/);
  });

  it("rejects refunding a PENDING payment", async () => {
    const payments = {
      findById: vi.fn().mockResolvedValue(makePayment({ status: "PENDING" })),
    } as unknown as PaymentRepository;
    const useCase = new CreateRefundUseCase(payments, {} as RefundRepository, {} as PaymentProviderRegistry);

    await expect(useCase.execute("payment-1", { amount: 10, reason: "x" })).rejects.toThrow(/cannot be refunded/);
  });

  it("rejects refunding an already-REFUNDED payment", async () => {
    const payments = {
      findById: vi.fn().mockResolvedValue(makePayment({ status: "REFUNDED" })),
    } as unknown as PaymentRepository;
    const useCase = new CreateRefundUseCase(payments, {} as RefundRepository, {} as PaymentProviderRegistry);

    await expect(useCase.execute("payment-1", { amount: 10, reason: "x" })).rejects.toThrow(/cannot be refunded/);
  });

  it("rejects a payment with no provider reference", async () => {
    const payments = {
      findById: vi.fn().mockResolvedValue(makePayment({ providerPaymentId: null })),
    } as unknown as PaymentRepository;
    const useCase = new CreateRefundUseCase(payments, {} as RefundRepository, {} as PaymentProviderRegistry);

    await expect(useCase.execute("payment-1", { amount: 10, reason: "x" })).rejects.toThrow(/no provider reference/);
  });

  it("rejects a refund amount exceeding the remaining refundable balance", async () => {
    const payments = { findById: vi.fn().mockResolvedValue(makePayment({ amount: new Prisma.Decimal(65) })) } as unknown as PaymentRepository;
    const refunds = { sumProcessed: vi.fn().mockResolvedValue(20) } as unknown as RefundRepository;
    const useCase = new CreateRefundUseCase(payments, refunds, {} as PaymentProviderRegistry);

    // 65 already paid, 20 already refunded -> 45 remaining; asking for 50 should fail.
    await expect(useCase.execute("payment-1", { amount: 50, reason: "x" })).rejects.toThrow(/exceeds the remaining refundable balance of 45.00/);
  });

  it("marks the payment PARTIALLY_REFUNDED on a processed partial refund", async () => {
    const payment = makePayment({ amount: new Prisma.Decimal(65) });
    const updateStatus = vi.fn().mockResolvedValue({ ...payment, status: "PARTIALLY_REFUNDED", refunds: [makeRefund({ amount: new Prisma.Decimal(20) })] });
    const payments = { findById: vi.fn().mockResolvedValue(payment), updateStatus } as unknown as PaymentRepository;
    const refunds = {
      sumProcessed: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(makeRefund({ amount: new Prisma.Decimal(20) })),
    } as unknown as RefundRepository;
    const providers = { get: vi.fn().mockReturnValue(makeProvider({ providerRefundId: "re_1", status: "PROCESSED" })) } as unknown as PaymentProviderRegistry;
    const useCase = new CreateRefundUseCase(payments, refunds, providers);

    const result = await useCase.execute("payment-1", { amount: 20, reason: "partial" });

    expect(updateStatus).toHaveBeenCalledWith("payment-1", "PARTIALLY_REFUNDED");
    expect(result.status).toBe("PARTIALLY_REFUNDED");
  });

  it("marks the payment REFUNDED once processed refunds cover the full amount", async () => {
    const payment = makePayment({ amount: new Prisma.Decimal(65) });
    const updateStatus = vi.fn().mockResolvedValue({ ...payment, status: "REFUNDED", refunds: [makeRefund({ amount: new Prisma.Decimal(45) })] });
    const payments = { findById: vi.fn().mockResolvedValue(payment), updateStatus } as unknown as PaymentRepository;
    const refunds = {
      // 20 already processed from an earlier refund; this call refunds the remaining 45.
      sumProcessed: vi.fn().mockResolvedValue(20),
      create: vi.fn().mockResolvedValue(makeRefund({ amount: new Prisma.Decimal(45) })),
    } as unknown as RefundRepository;
    const providers = { get: vi.fn().mockReturnValue(makeProvider({ providerRefundId: "re_2", status: "PROCESSED" })) } as unknown as PaymentProviderRegistry;
    const useCase = new CreateRefundUseCase(payments, refunds, providers);

    const result = await useCase.execute("payment-1", { amount: 45, reason: "final" });

    expect(updateStatus).toHaveBeenCalledWith("payment-1", "REFUNDED");
    expect(result.status).toBe("REFUNDED");
  });

  it("does not change payment status when the provider returns a PENDING refund", async () => {
    const payment = makePayment({ amount: new Prisma.Decimal(65) });
    const updateStatus = vi.fn();
    const payments = { findById: vi.fn().mockResolvedValue(payment), updateStatus } as unknown as PaymentRepository;
    const createdRefund = makeRefund({ amount: new Prisma.Decimal(65), status: "PENDING" });
    const refunds = {
      sumProcessed: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(createdRefund),
    } as unknown as RefundRepository;
    const providers = { get: vi.fn().mockReturnValue(makeProvider({ providerRefundId: "re_3", status: "PENDING" })) } as unknown as PaymentProviderRegistry;
    const useCase = new CreateRefundUseCase(payments, refunds, providers);

    const result = await useCase.execute("payment-1", { amount: 65, reason: "aba" });

    expect(updateStatus).not.toHaveBeenCalled();
    expect(result.status).toBe("SUCCEEDED");
    expect(result.refunds).toHaveLength(1);
    expect(result.refunds[0]?.status).toBe("PENDING");
  });
});
