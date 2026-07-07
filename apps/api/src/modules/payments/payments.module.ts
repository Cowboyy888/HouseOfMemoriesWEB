import { Module } from "@nestjs/common";
import { ConfirmManualPaymentUseCase } from "./application/confirm-manual-payment.use-case";
import { CreatePaymentUseCase } from "./application/create-payment.use-case";
import { CreateRefundUseCase } from "./application/create-refund.use-case";
import { GetPaymentUseCase } from "./application/get-payment.use-case";
import { HandlePaymentSuccessUseCase } from "./application/handle-payment-success.use-case";
import { ReconcilePaymentWebhookUseCase } from "./application/reconcile-payment-webhook.use-case";
import { VerifyPaymentUseCase } from "./application/verify-payment.use-case";
import { IDEMPOTENCY_STORE } from "./domain/idempotency-store";
import { INSTALLMENT_SCHEDULE_REPOSITORY } from "./domain/installment-schedule.repository";
import { PAYABLE_RESOLVER } from "./domain/payable-resolver";
import { PAYMENT_PROVIDER_REGISTRY } from "./domain/payment-provider.port";
import { PAYMENT_REPOSITORY } from "./domain/payment.repository";
import { REFUND_REPOSITORY } from "./domain/refund.repository";
import { PrismaIdempotencyStore } from "./infrastructure/prisma-idempotency-store";
import { PrismaInstallmentScheduleRepository } from "./infrastructure/prisma-installment-schedule.repository";
import { PrismaPayableResolver } from "./infrastructure/prisma-payable-resolver";
import { PrismaPaymentRepository } from "./infrastructure/prisma-payment.repository";
import { PrismaRefundRepository } from "./infrastructure/prisma-refund.repository";
import { AbaPaywayPaymentProvider } from "./infrastructure/providers/aba-payway-payment.provider";
import { KhqrPaymentProvider } from "./infrastructure/providers/khqr-payment.provider";
import { ManualBankTransferProvider } from "./infrastructure/providers/manual-bank-transfer.provider";
import { DefaultPaymentProviderRegistry } from "./infrastructure/providers/payment-provider.registry";
import { StripePaymentProvider } from "./infrastructure/providers/stripe-payment.provider";
import { PaymentsController } from "./payments.controller";
import { AbaPaywayWebhookController } from "./webhooks/aba-payway-webhook.controller";
import { StripeWebhookController } from "./webhooks/stripe-webhook.controller";

@Module({
  // No cross-module imports needed — payment-success side effects in other
  // modules react to PaymentSucceededEvent instead of being called directly.
  controllers: [PaymentsController, StripeWebhookController, AbaPaywayWebhookController],
  providers: [
    CreatePaymentUseCase,
    GetPaymentUseCase,
    VerifyPaymentUseCase,
    ReconcilePaymentWebhookUseCase,
    CreateRefundUseCase,
    ConfirmManualPaymentUseCase,
    HandlePaymentSuccessUseCase,
    StripePaymentProvider,
    AbaPaywayPaymentProvider,
    KhqrPaymentProvider,
    ManualBankTransferProvider,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    { provide: PAYABLE_RESOLVER, useClass: PrismaPayableResolver },
    { provide: IDEMPOTENCY_STORE, useClass: PrismaIdempotencyStore },
    { provide: PAYMENT_PROVIDER_REGISTRY, useClass: DefaultPaymentProviderRegistry },
    { provide: REFUND_REPOSITORY, useClass: PrismaRefundRepository },
    { provide: INSTALLMENT_SCHEDULE_REPOSITORY, useClass: PrismaInstallmentScheduleRepository },
  ],
})
export class PaymentsModule {}
