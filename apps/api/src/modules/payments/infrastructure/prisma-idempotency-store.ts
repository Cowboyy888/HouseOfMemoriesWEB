import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { IdempotencyRecord, IdempotencyStore } from "../domain/idempotency-store";

const TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(private readonly prisma: PrismaService) {}

  async find(key: string): Promise<{ requestHash: string; record: IdempotencyRecord | null } | null> {
    const existing = await this.prisma.client.idempotencyKey.findUnique({ where: { key } });
    if (!existing) {
      return null;
    }
    if (existing.expiresAt < new Date()) {
      return null;
    }
    return {
      requestHash: existing.requestHash,
      record:
        existing.statusCode != null
          ? { statusCode: existing.statusCode, responseBody: existing.responseBody }
          : null,
    };
  }

  /** Inserts the key as "in flight" (no response yet) so a second request
   * racing the first fails fast on the unique constraint instead of both
   * calling the payment provider. */
  async reserve(key: string, requestHash: string): Promise<void> {
    try {
      await this.prisma.client.idempotencyKey.create({
        data: { key, requestHash, expiresAt: new Date(Date.now() + TTL_MS) },
      });
    } catch {
      throw new ConflictException("A payment request with this idempotency key is already in progress");
    }
  }

  async complete(key: string, statusCode: number, responseBody: unknown): Promise<void> {
    await this.prisma.client.idempotencyKey.update({
      where: { key },
      data: { statusCode, responseBody: responseBody as never },
    });
  }
}
