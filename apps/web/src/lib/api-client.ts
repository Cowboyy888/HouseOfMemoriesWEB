import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * For endpoints that need the Better Auth session cookie (bookings,
 * payments, invoices, notifications — everything under "my"). Always
 * `credentials: "include"` and never cached, unlike the public car catalog
 * fetches in features/cars/api.ts, since these are user-specific and
 * frequently mutate.
 */
export async function authedFetch<T>(path: string, init?: RequestInit, parse?: (json: unknown) => T): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    const message = (details as { message?: string } | undefined)?.message ?? `Request to ${path} failed`;
    throw new ApiError(message, res.status, details);
  }

  const json = await res.json();
  return parse ? parse(json) : (json as T);
}
