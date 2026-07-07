import { describe, expect, it } from "vitest";
import { extractDocumentFields, type OcrDocumentInput } from "./document-ocr-engine";

function makeInput(overrides: Partial<OcrDocumentInput> = {}): OcrDocumentInput {
  return {
    documentType: "DRIVER_LICENSE",
    rawText: "Name: Jane Doe\nDOB: 1990-01-15\nLicense: AB12345",
    ...overrides,
  };
}

describe("extractDocumentFields", () => {
  it("extracts known fields from a driver license", () => {
    const result = extractDocumentFields(makeInput());

    expect(result.valid).toBe(true);
    expect(result.fields.name).toBe("Jane Doe");
    expect(result.fields.licenseNumber).toBe("AB12345");
  });

  it("marks documents invalid when required fields are missing", () => {
    const result = extractDocumentFields(makeInput({ rawText: "Name: Jane Doe" }));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing license number");
  });
});
