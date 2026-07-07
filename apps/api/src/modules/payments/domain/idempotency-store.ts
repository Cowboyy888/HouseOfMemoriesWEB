export interface IdempotencyRecord {
  statusCode: number;
  responseBody: unknown;
}

export const IDEMPOTENCY_STORE = Symbol("IDEMPOTENCY_STORE");

export interface IdempotencyStore {
  find(key: string): Promise<{ requestHash: string; record: IdempotencyRecord | null } | null>;
  reserve(key: string, requestHash: string): Promise<void>;
  complete(key: string, statusCode: number, responseBody: unknown): Promise<void>;
}
