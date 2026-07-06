import {
  CarDetailSchema,
  CarListResponseSchema,
  type CarDetail,
  type CarListQuery,
  type CarListResponse,
} from "@drivehub/contracts";
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

function buildQueryString(query: Partial<CarListQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCars(query: Partial<CarListQuery> = {}): Promise<CarListResponse> {
  const res = await fetch(`${env.apiUrl}/cars${buildQueryString(query)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    throw new ApiError("Failed to fetch cars", res.status, details);
  }
  return CarListResponseSchema.parse(await res.json());
}

export async function fetchCarById(id: string): Promise<CarDetail | null> {
  const res = await fetch(`${env.apiUrl}/cars/${id}`, { next: { revalidate: 60 } });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    throw new ApiError("Failed to fetch car", res.status, details);
  }
  return CarDetailSchema.parse(await res.json());
}
