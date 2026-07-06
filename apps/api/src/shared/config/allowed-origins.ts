/**
 * Single source of truth for which frontend origins may call this API —
 * used by both CORS (main.ts) and Better Auth's trustedOrigins (auth.ts) so
 * the two never drift out of sync.
 *
 * WEB_ORIGINS is comma-separated ("http://localhost:3000,http://localhost:3100").
 * WEB_ORIGIN (singular) is kept as a fallback for existing single-origin setups.
 */
export function getAllowedOrigins(): string[] {
  const plural = process.env.WEB_ORIGINS;
  if (plural) {
    return plural.split(",").map((origin) => origin.trim()).filter(Boolean);
  }
  return [process.env.WEB_ORIGIN ?? "http://localhost:3000"];
}
