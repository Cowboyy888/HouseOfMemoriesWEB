import { Module } from "@nestjs/common";
import { GenerateInvoiceForPaymentUseCase } from "./application/generate-invoice-for-payment.use-case";
import { GetInvoiceUseCase } from "./application/get-invoice.use-case";
import { ListMyInvoicesUseCase } from "./application/list-my-invoices.use-case";
import { PaymentSucceededListener } from "./application/payment-succeeded.listener";
import { INVOICE_REPOSITORY } from "./domain/invoice.repository";
import { PrismaInvoiceRepository } from "./infrastructure/prisma-invoice.repository";
import { InvoicesController } from "./invoices.controller";

@Module({
  controllers: [InvoicesController],
  providers: [
    GetInvoiceUseCase,
    ListMyInvoicesUseCase,
    GenerateInvoiceForPaymentUseCase,
    PaymentSucceededListener,
    { provide: INVOICE_REPOSITORY, useClass: PrismaInvoiceRepository },
  ],
})
export class InvoicesModule {}
