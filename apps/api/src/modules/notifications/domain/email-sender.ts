export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

/** Best-effort — a failed or unconfigured email send must never break the
 * booking/payment/invoice flow that triggered the notification. Unlike
 * PaymentProviderPort (where a failure is the whole point of the call), the
 * in-app Notification row is the source of truth; email is a courtesy
 * on top of it. See ResendEmailSender. */
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}
