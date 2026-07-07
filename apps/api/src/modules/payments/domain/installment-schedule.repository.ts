export const INSTALLMENT_SCHEDULE_REPOSITORY = Symbol("INSTALLMENT_SCHEDULE_REPOSITORY");

export interface InstallmentScheduleRepository {
  /** Applies a successful payment to a PaymentSchedule row: increments
   * amountPaid, marks it PAID once fully covered (and sets paidAt), and
   * marks the parent InstallmentPlan COMPLETED once every schedule row for
   * it is PAID. */
  recordPayment(scheduleId: string, amount: number): Promise<void>;
}
