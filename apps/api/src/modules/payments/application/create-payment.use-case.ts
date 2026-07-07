import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreatePaymentRequest, PaymentResult } from "@drivehub/contracts";
import { IDEMPOTENCY_STORE, type IdempotencyStore } from "../domain/idempotency-store";
import { PAYABLE_RESOLVER, type PayableResolver } from "../domain/payable-resolver";
import { PAYMENT_PROVIDER_REGISTRY, type PaymentProviderRegistry } from "../domain/payment-provider.port";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";
import { toPaymentResult } from "./payment.mapper";

export function hashRequest(request: CreatePaymentRequest, customerId: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ ...request, customerId }))
    .digest("hex");
}

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYABLE_RESOLVER) private readonly payableResolver: PayableResolver,
    @Inject(PAYMENT_PROVIDER_REGISTRY) private readonly providers: PaymentProviderRegistry,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
    private readonly handlePaymentSuccess: HandlePaymentSuccessUseCase,
  ) {}

  async execute(
    request: CreatePaymentRequest,
    customer: { id: string; email?: string | null },
  ): Promise<PaymentResult> {
    const requestHash = hashRequest(request, customer.id);
    const existing = await this.idempotency.find(request.idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException("Idempotency key was already used for a different request");
      }
      if (existing.record) {
        if (existing.record.statusCode >= 200 && existing.record.statusCode < 300) {
          return existing.record.responseBody as PaymentResult;
        }
        const body = existing.record.responseBody as { message?: string } | null;
        throw new HttpException(body?.message ?? "Payment creation failed", existing.record.statusCode);
      }
      throw new ConflictException("A payment request with this idempotency key is already in progress");
    }
    await this.idempotency.reserve(request.idempotencyKey, requestHash);

    try {
      const payable = await this.payableResolver.resolve(request.payableType, request.payableId);
      if (!payable) {
        throw new NotFoundException(`${request.payableType} ${request.payableId} was not found`);
      }
      if (payable.ownerCustomerId !== customer.id) {
        throw new ForbiddenException("You can only pay for your own booking, sale, or installment");
      }
      if (payable.amountDue <= 0) {
        throw new ConflictException("This has already been paid in full");
      }
      if (request.amount !== payable.amountDue) {
        throw new BadRequestException(`Amount must be exactly ${payable.amountDue.toFixed(2)}`);
      }

      const payment = await this.payments.create({
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        provider: request.provider,
        payableType: request.payableType,
        payableId: request.payableId,
        paidByCustomerId: customer.id,
      });

      const provider = this.providers.get(request.provider);
      const providerResult = await provider.createPayment({
        paymentId: payment.id,
        amount: request.amount,
        currency: request.currency,
        description: `${request.payableType} ${request.payableId}`,
        customerEmail: customer.email,
      });

      const updated = await this.payments.updateProviderResult(payment.id, {
        providerPaymentId: providerResult.providerPaymentId,
        providerMetadata: providerResult.providerMetadata,
        status: providerResult.status,
      });

      if (providerResult.status === "SUCCEEDED") {
        await this.handlePaymentSuccess.execute(updated);
      }

      const result = toPaymentResult(updated);
      await this.idempotency.complete(request.idempotencyKey, HttpStatus.CREATED, result);
      return result;
    } catch (error) {
      // Cache the failure too (Stripe's own idempotency semantics) — without
      // this, a reserved-but-never-completed key would permanently 409 on
      // every retry until the 24h TTL expires, turning a transient failure
      // into a dead key instead of something the client can safely retry.
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof Error ? error.message : "Payment creation failed";
      await this.idempotency.complete(request.idempotencyKey, status, { message });
      throw error;
    }
  }
}
