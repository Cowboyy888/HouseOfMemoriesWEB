import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison so signature checking doesn't leak timing
 * information about how many leading characters matched. */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
