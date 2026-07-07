import { createHmac } from "node:crypto";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  CreatePaymentInput,
  CreatePaymentOutput,
  PaymentProviderPort,
  RefundPaymentInput,
  RefundPaymentOutput,
  VerifyPaymentOutput,
} from "../../domain/payment-provider.port";

/** ABA PayWay signs (and verifies) requests by sorting the field names
 * ascending, concatenating the values in that order, HMAC-SHA512'ing with
 * the merchant API key, then base64-encoding — this is ABA's documented
 * hashing rule and is shared by request signing and webhook verification. */
export function signAbaPayWayFields(fields: Record<string, string>, apiKey: string): string {
  const orderedValues = Object.keys(fields)
    .sort()
    .map((key) => fields[key] ?? "");
  return createHmac("sha512", apiKey).update(orderedValues.join("")).digest("base64");
}

/**
 * Field-name coverage for the purchase/checkout API is based on ABA's
 * publicly documented merchant integration guide, not a source verified as
 * thoroughly as the official Bakong KHQR SDK PDF (see KhqrPaymentProvider) —
 * flag this if ABA changes their field contract and requests start failing.
 */
@Injectable()
export class AbaPaywayPaymentProvider implements PaymentProviderPort {
  readonly provider = "ABA_PAYWAY" as const;

  private get config() {
    const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
    const apiKey = process.env.ABA_PAYWAY_API_KEY;
    const baseUrl = process.env.ABA_PAYWAY_BASE_URL ?? "https://checkout-sandbox.payway.com.kh";
    if (!merchantId || !apiKey) {
      return null;
    }
    return { merchantId, apiKey, baseUrl };
  }

  private requireConfig() {
    const config = this.config;
    if (!config) {
      throw new ServiceUnavailableException(
        "ABA PayWay is not configured (ABA_PAYWAY_MERCHANT_ID / ABA_PAYWAY_API_KEY are unset)",
      );
    }
    return config;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const { merchantId, apiKey, baseUrl } = this.requireConfig();

    const reqTime = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const tranId = input.paymentId.replace(/-/g, "").slice(0, 20);

    const fields: Record<string, string> = {
      req_time: reqTime,
      merchant_id: merchantId,
      tran_id: tranId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
    };
    const hash = signAbaPayWayFields(fields, apiKey);

    const body = new URLSearchParams({ ...fields, hash });
    const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new BadRequestException(`ABA PayWay rejected the payment request (${response.status})`);
    }

    const payload = (await response.json()) as { checkout_url?: string; checkoutUrl?: string };
    const checkoutUrl = payload.checkout_url ?? payload.checkoutUrl;

    return {
      providerPaymentId: tranId,
      status: "PENDING",
      providerMetadata: checkoutUrl ? { checkoutUrl } : null,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyPaymentOutput> {
    const { merchantId, apiKey, baseUrl } = this.requireConfig();

    const reqTime = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const fields: Record<string, string> = { req_time: reqTime, merchant_id: merchantId, tran_id: providerPaymentId };
    const hash = signAbaPayWayFields(fields, apiKey);

    const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...fields, hash }),
    });

    if (!response.ok) {
      return { status: "PENDING" };
    }
    const payload = (await response.json()) as { status?: string | number };
    const succeeded = payload.status === 0 || payload.status === "0";
    return { status: succeeded ? "SUCCEEDED" : "PENDING" };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { merchantId, apiKey, baseUrl } = this.requireConfig();

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      tran_id: input.providerPaymentId,
      refund_amount: input.amount.toFixed(2),
    };
    const hash = signAbaPayWayFields(fields, apiKey);

    const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...fields, hash }),
    });

    if (!response.ok) {
      throw new BadRequestException(`ABA PayWay rejected the refund request (${response.status})`);
    }

    return { providerRefundId: `${input.providerPaymentId}-refund`, status: "PENDING" };
  }
}
