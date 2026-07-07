import { BadRequestException, Controller, Post, Req, ServiceUnavailableException } from "@nestjs/common";
import type { Request } from "express";
import Stripe from "stripe";
import { ReconcilePaymentWebhookUseCase } from "../application/reconcile-payment-webhook.use-case";

const RELEVANT_EVENTS: Record<string, "SUCCEEDED" | "FAILED"> = {
  "payment_intent.succeeded": "SUCCEEDED",
  "payment_intent.payment_failed": "FAILED",
  "payment_intent.canceled": "FAILED",
};

/**
 * Requires the raw request body — main.ts mounts `express.raw()` on this
 * exact path before the global `express.json()`, mirroring how Better Auth
 * gets an unparsed body for its own signature checking. `req.body` here is
 * a Buffer, not a parsed object.
 */
@Controller("payments/webhooks")
export class StripeWebhookController {
  constructor(private readonly reconcile: ReconcilePaymentWebhookUseCase) {}

  @Post("stripe")
  async handle(@Req() req: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException("Stripe webhooks are not configured (STRIPE_WEBHOOK_SECRET is unset)");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException("Missing Stripe-Signature header");
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(req.body as Buffer, signature, secret);
    } catch {
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    const status = RELEVANT_EVENTS[event.type];
    if (status) {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.reconcile.execute(intent.id, status);
    }

    return { received: true };
  }
}
