import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ProviderPaymentStatus } from "../domain/payment-provider.port";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { HandlePaymentSuccessUseCase } from "./handle-payment-success.use-case";

@Injectable()
export class ReconcilePaymentWebhookUseCase {
  private readonly logger = new Logger(ReconcilePaymentWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    private readonly handlePaymentSuccess: HandlePaymentSuccessUseCase,
  ) {}

  async execute(providerPaymentId: string, status: ProviderPaymentStatus): Promise<void> {
    const payment = await this.payments.findByProviderPaymentId(providerPaymentId);
    if (!payment) {
      // A webhook for a payment this system didn't create (wrong environment,
      // replayed test event) — log and ack 200 rather than erroring, since
      // there's nothing here to reconcile and the provider would otherwise
      // retry indefinitely.
      this.logger.warn(`Webhook referenced unknown providerPaymentId=${providerPaymentId}`);
      return;
    }
    if (payment.status === status) {
      return;
    }
    const updated = await this.payments.updateProviderResult(payment.id, {
      providerPaymentId,
      providerMetadata: payment.providerMetadata as Record<string, string> | null,
      status,
    });

    if (status === "SUCCEEDED") {
      await this.handlePaymentSuccess.execute(updated);
    }
  }
}
