import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  CreatePaymentInput,
  CreatePaymentOutput,
  PaymentProviderPort,
  RefundPaymentInput,
  RefundPaymentOutput,
  VerifyPaymentOutput,
} from "../../domain/payment-provider.port";

// No published type declarations — verified directly against the installed
// package source (node_modules/bakong-khqr/src) and the official Bakong
// KHQR SDK Documentation (NBC, v2.9, May 2025) rather than guessed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BakongKHQR, khqrData, MerchantInfo } = require("bakong-khqr");

interface KhqrGenerateResponse {
  status: { code: number; errorCode: number | null; message: string | null };
  data: { qr: string; md5: string } | null;
}

/**
 * QR generation/verification/decoding is a pure local function (EMV/TLV
 * encoding per the KHQR spec) — no network call, no merchant onboarding
 * required, so this half of the provider works even with placeholder
 * account details. Checking whether a generated QR was actually paid does
 * require live Bakong merchant credentials (BAKONG_API_TOKEN) and calls the
 * Bakong Open API, whose exact "check transaction" endpoint was NOT found
 * in the official SDK PDF (that doc covers generate/decode/verify/deeplink
 * only) — the endpoint below is the one used across community integration
 * guides but is unverified against an authoritative NBC source.
 */
@Injectable()
export class KhqrPaymentProvider implements PaymentProviderPort {
  readonly provider = "KHQR" as const;

  private get merchantConfig() {
    return {
      bakongAccountId: process.env.BAKONG_ACCOUNT_ID ?? "drivehub_demo@wing",
      merchantName: process.env.BAKONG_MERCHANT_NAME ?? "DriveHub Demo",
      merchantCity: process.env.BAKONG_MERCHANT_CITY ?? "Phnom Penh",
      merchantId: process.env.BAKONG_MERCHANT_ID ?? "DRIVEHUB001",
      acquiringBank: process.env.BAKONG_ACQUIRING_BANK ?? "Wing Bank",
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const { bakongAccountId, merchantName, merchantCity, merchantId, acquiringBank } = this.merchantConfig;

    const merchantInfo = new MerchantInfo(bakongAccountId, merchantName, merchantCity, merchantId, acquiringBank, {
      currency: input.currency === "USD" ? khqrData.currency.usd : khqrData.currency.khr,
      amount: input.amount,
      billNumber: input.paymentId.slice(0, 25),
      storeLabel: "DriveHub",
      // A non-zero amount makes this a "dynamic" KHQR, which the spec
      // requires an expiry for — 15 minutes to complete the scan-to-pay.
      expirationTimestamp: Date.now() + 15 * 60 * 1000,
    });

    const khqr = new BakongKHQR();
    const result: KhqrGenerateResponse = khqr.generateMerchant(merchantInfo);

    if (result.status.code !== 0 || !result.data) {
      throw new BadRequestException(`KHQR generation failed: ${result.status.message ?? "unknown error"}`);
    }

    return {
      providerPaymentId: result.data.md5,
      status: "PENDING",
      providerMetadata: { qr: result.data.qr, md5: result.data.md5 },
    };
  }

  async verifyPayment(_providerPaymentId: string, providerMetadata?: Record<string, string> | null): Promise<VerifyPaymentOutput> {
    const token = process.env.BAKONG_API_TOKEN;
    const md5 = providerMetadata?.md5;
    if (!token || !md5) {
      throw new ServiceUnavailableException(
        "Bakong transaction-status checking is not configured (BAKONG_API_TOKEN is unset)",
      );
    }

    let response: Response;
    try {
      response = await fetch("https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ md5 }),
      });
    } catch {
      throw new ServiceUnavailableException("Bakong transaction-status service is temporarily unreachable, please try again");
    }

    if (!response.ok) {
      return { status: "PENDING" };
    }
    const payload = (await response.json()) as { responseCode?: number };
    return { status: payload.responseCode === 0 ? "SUCCEEDED" : "PENDING" };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new BadRequestException("KHQR payments are refunded via the paying bank/wallet, not through this API");
  }
}
