// Seeded local dev account (vault/08 Deployment/Local-Development.md) — a
// real Better Auth account promoted to SUPER_ADMIN, not a production secret.
export const SUPER_ADMIN_EMAIL = "superadmin@drivehub.example";
export const SUPER_ADMIN_PASSWORD = "correct-horse-battery";

// Meets the sign-up form's own min-length validation, reused for every
// throwaway account these tests create.
export const TEST_PASSWORD = "correct-horse-battery";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@drivehub.example`;
}

export interface BookingWindow {
  startDate: string;
  endDate: string;
}

/**
 * There's no test-DB reset and only one seeded car (the Camry), so every
 * spec that books it must stay clear of both the fixed seed demo booking
 * (2026-08-01..05, see vault/08 Deployment/Local-Development.md) and any
 * other spec file's own window — a GiST exclusion constraint rejects
 * overlapping bookings for the same car. Each spec passes its own
 * non-overlapping `minOffsetDays` range; the random pick inside that range
 * just keeps repeat runs of the same spec from colliding with themselves.
 */
export function futureBookingWindow(minOffsetDays: number, spreadDays: number, lengthDays = 3): BookingWindow {
  const offset = minOffsetDays + Math.floor(Math.random() * spreadDays);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + lengthDays);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}
