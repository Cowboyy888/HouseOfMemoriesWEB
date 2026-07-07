import { Injectable } from "@nestjs/common";
import type { PaymentProviderType } from "@drivehub/contracts";
import type { PaymentProviderPort, PaymentProviderRegistry } from "../../domain/payment-provider.port";
import { AbaPaywayPaymentProvider } from "./aba-payway-payment.provider";
import { KhqrPaymentProvider } from "./khqr-payment.provider";
import { ManualBankTransferProvider } from "./manual-bank-transfer.provider";
import { StripePaymentProvider } from "./stripe-payment.provider";

@Injectable()
export class DefaultPaymentProviderRegistry implements PaymentProviderRegistry {
  private readonly providers: Record<PaymentProviderType, PaymentProviderPort>;

  constructor(
    stripe: StripePaymentProvider,
    aba: AbaPaywayPaymentProvider,
    khqr: KhqrPaymentProvider,
    manual: ManualBankTransferProvider,
  ) {
    this.providers = { STRIPE: stripe, ABA_PAYWAY: aba, KHQR: khqr, MANUAL: manual };
  }

  get(provider: PaymentProviderType): PaymentProviderPort {
    return this.providers[provider];
  }
}
