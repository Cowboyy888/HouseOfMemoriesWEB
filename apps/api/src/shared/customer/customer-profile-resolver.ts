export interface ResolvedCustomerProfile {
  id: string;
  email: string | null;
}

export const CUSTOMER_PROFILE_RESOLVER = Symbol("CUSTOMER_PROFILE_RESOLVER");

/** Every module keys its writes off CustomerProfile.id, not the Better Auth
 * User.id from the session — this is the one place that translation
 * happens so use-cases never need to know about Better Auth's User shape.
 * Shared across modules (Payments, Bookings) rather than duplicated once a
 * second consumer needed it. */
export interface CustomerProfileResolver {
  resolveByUserId(userId: string): Promise<ResolvedCustomerProfile | null>;
}
