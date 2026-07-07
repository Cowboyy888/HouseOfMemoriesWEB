import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PaymentResult } from "@drivehub/contracts";
import { PAYMENT_PROVIDER_REGISTRY, type PaymentProviderRegistry } from "../domain/payment-provider.port";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";
import { toPaymentResult } from "./payment.mapper";

@Injectable()
export class VerifyPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_PROVIDER_REGISTRY) private readonly providers: PaymentProviderRegistry,
    private readonly handlePaymentSuccess: HandlePaymentSuccessUseCase,
  ) {}

  async execute(paymentId: string): Promise<PaymentResult> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} was not found`);
    }
    if (payment.status !== "PENDING" || !payment.providerPaymentId) {
      return toPaymentResult(payment);
    }

    const provider = this.providers.get(payment.provider);
    const verification = await provider.verifyPayment(
      payment.providerPaymentId,
      payment.providerMetadata as Record<string, string> | null,
    );

    if (verification.status === payment.status) {
      return toPaymentResult(payment);
    }

    const updated = await this.payments.updateProviderResult(payment.id, {
      providerPaymentId: payment.providerPaymentId,
      providerMetadata: (verification.providerMetadata as Record<string, string> | undefined) ?? (payment.providerMetadata as Record<string, string> | null),
      status: verification.status,
    });

    if (verification.status === "SUCCEEDED") {
      await this.handlePaymentSuccess.execute(updated);
    }

    return toPaymentResult(updated);
  }
}
