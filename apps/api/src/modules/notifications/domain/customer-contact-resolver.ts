export const CUSTOMER_CONTACT_RESOLVER = Symbol("CUSTOMER_CONTACT_RESOLVER");

/** Notifications only ever has a CustomerProfile.id (from domain events),
 * never the Better Auth User — this is the one place that gets translated
 * to an email address to send to. */
export interface CustomerContactResolver {
  resolveEmail(customerId: string): Promise<string | null>;
}
