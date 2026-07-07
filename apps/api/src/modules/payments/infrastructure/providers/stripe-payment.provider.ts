import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import Stripe from "stripe";
import type {
  CreatePaymentInput,
  CreatePaymentOutput,
  PaymentProviderPort,
  ProviderPaymentStatus,
  RefundPaymentInput,
  RefundPaymentOutput,
  VerifyPaymentOutput,
} from "../../domain/payment-provider.port";

function mapIntentStatus(status: Stripe.PaymentIntent.Status): ProviderPaymentStatus {
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "canceled") return "FAILED";
  return "PENDING";
}

@Injectable()
export class StripePaymentProvider implements PaymentProviderPort {
  readonly provider = "STRIPE" as const;
  private readonly client: Stripe | null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    // Mirrors the Better Auth OAuth pattern: real code, inert until a real
    // key is supplied — constructing the SDK eagerly would throw at
    // module-load time and take the whole API down over an unrelated route.
    this.client = secretKey ? new Stripe(secretKey) : null;
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new ServiceUnavailableException("Stripe is not configured (STRIPE_SECRET_KEY is unset)");
    }
    return this.client;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const stripe = this.requireClient();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      description: input.description,
      receipt_email: input.customerEmail ?? undefined,
      metadata: { paymentId: input.paymentId },
      automatic_payment_methods: { enabled: true },
    });

    return {
      providerPaymentId: intent.id,
      status: mapIntentStatus(intent.status),
      providerMetadata: intent.client_secret ? { clientSecret: intent.client_secret } : null,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyPaymentOutput> {
    const stripe = this.requireClient();
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
    return { status: mapIntentStatus(intent.status) };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const stripe = this.requireClient();
    const refund = await stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: Math.round(input.amount * 100),
      reason: "requested_by_customer",
    });
    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "PROCESSED" : "PENDING",
    };
  }
}
