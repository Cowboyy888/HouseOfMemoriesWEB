import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PaymentResult } from "@drivehub/contracts";
import { PAYMENT_REPOSITORY, type PaymentRepository } from "../domain/payment.repository";
import { toPaymentResult } from "./payment.mapper";

@Injectable()
export class GetPaymentUseCase {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository) {}

  async execute(paymentId: string, requestingCustomerId: string): Promise<PaymentResult> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} was not found`);
    }
    if (payment.paidByCustomerId !== requestingCustomerId) {
      throw new ForbiddenException("You can only view your own payments");
    }
    return toPaymentResult(payment);
  }
}
