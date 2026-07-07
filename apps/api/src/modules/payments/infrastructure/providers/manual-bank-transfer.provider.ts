import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CreatePaymentInput,
  CreatePaymentOutput,
  PaymentProviderPort,
  RefundPaymentInput,
  RefundPaymentOutput,
  VerifyPaymentOutput,
} from "../../domain/payment-provider.port";

/**
 * No external API — a staff member reconciles the transfer against the bank
 * statement and confirms it manually (see Sprint 6 Module 2+ for the admin
 * confirmation endpoint). This provider only records the reference the
 * customer needs to make the transfer and always starts PENDING.
 */
@Injectable()
export class ManualBankTransferProvider implements PaymentProviderPort {
  readonly provider = "MANUAL" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const reference = `DH-${input.paymentId.slice(0, 8).toUpperCase()}`;
    return {
      providerPaymentId: reference,
      status: "PENDING",
      providerMetadata: {
        bankInstructions:
          `Transfer ${input.amount.toFixed(2)} ${input.currency} to DriveHub Inc, ` +
          `Account 001-234-5678, Reference ${reference}. Your booking is confirmed once staff verify the transfer.`,
      },
    };
  }

  async verifyPayment(): Promise<VerifyPaymentOutput> {
    // Status only ever changes when staff confirm it via the admin
    // reconciliation flow — there is no external system to poll.
    return { status: "PENDING" };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new BadRequestException("Manual bank transfers are refunded by initiating a bank transfer back, not through this API");
  }
}
