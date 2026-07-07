import { BadRequestException, Controller, Headers, Post, Req, ServiceUnavailableException } from "@nestjs/common";
import type { Request } from "express";
import { signAbaPayWayFields } from "../infrastructure/providers/aba-payway-payment.provider";
import { timingSafeEqualStrings } from "../infrastructure/webhook-signature.util";
import { ReconcilePaymentWebhookUseCase } from "../application/reconcile-payment-webhook.use-case";

@Controller("payments/webhooks")
export class AbaPaywayWebhookController {
  constructor(private readonly reconcile: ReconcilePaymentWebhookUseCase) {}

  @Post("aba-payway")
  async handle(@Req() req: Request, @Headers("x-payway-hmac-sha512") signature?: string) {
    const apiKey = process.env.ABA_PAYWAY_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("ABA PayWay is not configured (ABA_PAYWAY_API_KEY is unset)");
    }
    if (!signature) {
      throw new BadRequestException("Missing X-PayWay-HMAC-SHA512 header");
    }

    const fields = req.body as Record<string, string>;
    const expected = signAbaPayWayFields(fields, apiKey);
    if (!timingSafeEqualStrings(expected, signature)) {
      throw new BadRequestException("Invalid ABA PayWay webhook signature");
    }

    const tranId = fields.tran_id;
    if (tranId) {
      const succeeded = fields.status === "0" || fields.status === "APPROVED";
      await this.reconcile.execute(tranId, succeeded ? "SUCCEEDED" : "FAILED");
    }

    return { received: true };
  }
}
