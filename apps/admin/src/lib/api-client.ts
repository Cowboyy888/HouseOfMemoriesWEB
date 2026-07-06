import { env } from "./env";

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

/** All admin API calls carry the session cookie — every endpoint here is
 * RBAC-gated server-side by PermissionsGuard, this client never decides
 * access on its own. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    throw new ApiError(
      res.status === 401
        ? "Sign in required"
        : res.status === 403
          ? "You don't have permission to view this"
          : "Request failed",
      res.status,
      details,
    );
  }

  return res.json() as Promise<T>;
}
