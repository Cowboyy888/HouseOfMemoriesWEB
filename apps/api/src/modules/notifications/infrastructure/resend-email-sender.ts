import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import type { EmailSender } from "../domain/email-sender";

/** Inert without RESEND_API_KEY/RESEND_FROM_EMAIL — same "real code, unset
 * until real credentials exist" pattern as Stripe/ABA/Google/Facebook OAuth.
 * Unlike those, a failure here is swallowed (logged, not thrown): the
 * in-app Notification row already exists by the time this runs, so a flaky
 * email provider must never fail the booking/payment flow that triggered it. */
@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly client: Resend | null;
  private readonly fromEmail = process.env.RESEND_FROM_EMAIL;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.client || !this.fromEmail) {
      this.logger.debug(`Email not sent (Resend unconfigured): "${subject}" to ${to}`);
      return;
    }

    try {
      await this.client.emails.send({ from: this.fromEmail, to, subject, text: body });
    } catch (error) {
      this.logger.warn(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
