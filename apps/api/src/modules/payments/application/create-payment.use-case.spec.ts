import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@drivehub/database";
import type { CreatePaymentRequest } from "@drivehub/contracts";
import type { IdempotencyStore } from "../domain/idempotency-store";
import type { PayableResolver } from "../domain/payable-resolver";
import type { CreatePaymentOutput, PaymentProviderPort, PaymentProviderRegistry } from "../domain/payment-provider.port";
import type { PaymentEntity, PaymentRepository } from "../domain/payment.repository";
import { CreatePaymentUseCase, hashRequest } from "./create-payment.use-case";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";

const request: CreatePaymentRequest = {
  amount: 65,
  currency: "USD",
  method: "BANK_TRANSFER",
  provider: "MANUAL",
  payableType: "BOOKING",
  payableId: "booking-1",
  idempotencyKey: "key-1",
};

const customer = { id: "customer-1", email: "customer@example.com" };

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return {
    id: "payment-1",
    amount: new Prisma.Decimal(65),
    currency: "USD",
    method: "BANK_TRANSFER",
    provider: "MANUAL",
    providerPaymentId: null,
    providerMetadata: null,
    status: "PENDING",
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

function makeIdempotencyStore(): IdempotencyStore {
  return { find: vi.fn().mockResolvedValue(null), reserve: vi.fn(), complete: vi.fn() };
}

function makeProvider(result: CreatePaymentOutput): PaymentProviderPort {
  return {
    provider: "MANUAL",
    createPayment: vi.fn().mockResolvedValue(result),
    verifyPayment: vi.fn(),
    refundPayment: vi.fn(),
  };
}

function makeHandlePaymentSuccess(): HandlePaymentSuccessUseCase {
  return { execute: vi.fn() } as unknown as HandlePaymentSuccessUseCase;
}

describe("CreatePaymentUseCase", () => {
  it("replays a cached successful response for a repeated idempotency key, without touching the provider or creating a new payment", async () => {
    const cachedResult = { id: "payment-1", status: "PENDING" };
    const idempotency = {
      find: vi.fn().mockResolvedValue({
        requestHash: hashRequest(request, customer.id),
        record: { statusCode: 201, responseBody: cachedResult },
      }),
      reserve: vi.fn(),
      complete: vi.fn(),
    } as unknown as IdempotencyStore;
    const paymentsRepo = { create: vi.fn() } as unknown as PaymentRepository;
    const providers = { get: vi.fn() } as unknown as PaymentProviderRegistry;

    const useCase = new CreatePaymentUseCase(paymentsRepo, {} as PayableResolver, providers, idempotency, makeHandlePaymentSuccess());
    const result = await useCase.execute(request, customer);

    expect(result).toEqual(cachedResult);
    expect(idempotency.reserve).not.toHaveBeenCalled();
    expect(paymentsRepo.create).not.toHaveBeenCalled();
    expect(providers.get).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the same key is reused with a different request body", async () => {
    const idempotency = {
      find: vi.fn().mockResolvedValue({ requestHash: "a-different-hash", record: null }),
      reserve: vi.fn(),
      complete: vi.fn(),
    } as unknown as IdempotencyStore;
    const useCase = new CreatePaymentUseCase(
      {} as PaymentRepository,
      {} as PayableResolver,
      {} as PaymentProviderRegistry,
      idempotency,
      makeHandlePaymentSuccess(),
    );

    await expect(useCase.execute(request, customer)).rejects.toThrow(/different request/);
    expect(idempotency.reserve).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the payable doesn't exist", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = { resolve: vi.fn().mockResolvedValue(null) } as unknown as PayableResolver;
    const useCase = new CreatePaymentUseCase(
      {} as PaymentRepository,
      payableResolver,
      {} as PaymentProviderRegistry,
      idempotency,
      makeHandlePaymentSuccess(),
    );

    await expect(useCase.execute(request, customer)).rejects.toThrow(/was not found/);
    expect(idempotency.complete).toHaveBeenCalledWith("key-1", 404, expect.any(Object));
  });

  it("throws ForbiddenException when the payable belongs to a different customer", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "someone-else", amountDue: 65 }),
    } as unknown as PayableResolver;
    const useCase = new CreatePaymentUseCase(
      {} as PaymentRepository,
      payableResolver,
      {} as PaymentProviderRegistry,
      idempotency,
      makeHandlePaymentSuccess(),
    );

    await expect(useCase.execute(request, customer)).rejects.toThrow(/your own/);
  });

  it("throws ConflictException when the payable is already paid in full", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "customer-1", amountDue: 0 }),
    } as unknown as PayableResolver;
    const useCase = new CreatePaymentUseCase(
      {} as PaymentRepository,
      payableResolver,
      {} as PaymentProviderRegistry,
      idempotency,
      makeHandlePaymentSuccess(),
    );

    await expect(useCase.execute(request, customer)).rejects.toThrow(/already been paid in full/);
  });

  it("throws BadRequestException when the amount doesn't match amountDue", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "customer-1", amountDue: 100 }),
    } as unknown as PayableResolver;
    const useCase = new CreatePaymentUseCase(
      {} as PaymentRepository,
      payableResolver,
      {} as PaymentProviderRegistry,
      idempotency,
      makeHandlePaymentSuccess(),
    );

    await expect(useCase.execute(request, customer)).rejects.toThrow(/must be exactly 100.00/);
  });

  it("creates the payment, calls the provider, and completes the idempotency record on success", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "customer-1", amountDue: 65 }),
    } as unknown as PayableResolver;
    const created = makePayment();
    const updated = makePayment({ status: "PENDING", providerPaymentId: "DH-REF" });
    const paymentsRepo = {
      create: vi.fn().mockResolvedValue(created),
      updateProviderResult: vi.fn().mockResolvedValue(updated),
    } as unknown as PaymentRepository;
    const provider = makeProvider({ providerPaymentId: "DH-REF", status: "PENDING", providerMetadata: null });
    const providers = { get: vi.fn().mockReturnValue(provider) } as unknown as PaymentProviderRegistry;
    const handlePaymentSuccess = makeHandlePaymentSuccess();

    const useCase = new CreatePaymentUseCase(paymentsRepo, payableResolver, providers, idempotency, handlePaymentSuccess);
    const result = await useCase.execute(request, customer);

    expect(idempotency.reserve).toHaveBeenCalledWith("key-1", expect.any(String));
    expect(result.id).toBe("payment-1");
    expect(handlePaymentSuccess.execute).not.toHaveBeenCalled();
    expect(idempotency.complete).toHaveBeenCalledWith("key-1", 201, expect.objectContaining({ id: "payment-1" }));
  });

  it("runs HandlePaymentSuccessUseCase when the provider returns SUCCEEDED synchronously", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "customer-1", amountDue: 65 }),
    } as unknown as PayableResolver;
    const paymentsRepo = {
      create: vi.fn().mockResolvedValue(makePayment()),
      updateProviderResult: vi.fn().mockResolvedValue(makePayment({ status: "SUCCEEDED" })),
    } as unknown as PaymentRepository;
    const provider = makeProvider({ providerPaymentId: "pi_123", status: "SUCCEEDED", providerMetadata: null });
    const providers = { get: vi.fn().mockReturnValue(provider) } as unknown as PaymentProviderRegistry;
    const handlePaymentSuccess = makeHandlePaymentSuccess();

    const useCase = new CreatePaymentUseCase(paymentsRepo, payableResolver, providers, idempotency, handlePaymentSuccess);
    await useCase.execute(request, customer);

    expect(handlePaymentSuccess.execute).toHaveBeenCalledTimes(1);
  });

  it("caches the failure against the idempotency key when the provider throws", async () => {
    const idempotency = makeIdempotencyStore();
    const payableResolver = {
      resolve: vi.fn().mockResolvedValue({ ownerCustomerId: "customer-1", amountDue: 65 }),
    } as unknown as PayableResolver;
    const paymentsRepo = { create: vi.fn().mockResolvedValue(makePayment()) } as unknown as PaymentRepository;
    const provider: PaymentProviderPort = {
      provider: "MANUAL",
      createPayment: vi.fn().mockRejectedValue(new Error("provider down")),
      verifyPayment: vi.fn(),
      refundPayment: vi.fn(),
    };
    const providers = { get: vi.fn().mockReturnValue(provider) } as unknown as PaymentProviderRegistry;

    const useCase = new CreatePaymentUseCase(paymentsRepo, payableResolver, providers, idempotency, makeHandlePaymentSuccess());

    await expect(useCase.execute(request, customer)).rejects.toThrow("provider down");
    expect(idempotency.complete).toHaveBeenCalledWith("key-1", 500, { message: "provider down" });
  });
});
