import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signAbaPayWayFields } from "./aba-payway-payment.provider";

describe("signAbaPayWayFields", () => {
  it("matches a hand-computed HMAC-SHA512 of the sorted, concatenated field values", () => {
    const fields = { tran_id: "abc123", merchant_id: "M1", amount: "65.00" };
    const expected = createHmac("sha512", "secret").update("65.00M1abc123").digest("base64");

    expect(signAbaPayWayFields(fields, "secret")).toBe(expected);
  });

  it("is independent of field declaration order (fields are sorted before signing)", () => {
    const a = signAbaPayWayFields({ b: "2", a: "1" }, "secret");
    const b = signAbaPayWayFields({ a: "1", b: "2" }, "secret");

    expect(a).toBe(b);
  });

  it("produces a different signature for a different API key", () => {
    const fields = { tran_id: "abc123" };

    expect(signAbaPayWayFields(fields, "secret-one")).not.toBe(signAbaPayWayFields(fields, "secret-two"));
  });

  it("produces a different signature when any field value changes", () => {
    const base = signAbaPayWayFields({ tran_id: "abc123", amount: "65.00" }, "secret");
    const changed = signAbaPayWayFields({ tran_id: "abc123", amount: "65.01" }, "secret");

    expect(base).not.toBe(changed);
  });
});
