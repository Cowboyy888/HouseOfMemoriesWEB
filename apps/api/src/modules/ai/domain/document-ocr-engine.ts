export type DocumentType = "DRIVER_LICENSE" | "PASSPORT" | "REGISTRATION";

export interface OcrDocumentInput {
  documentType: DocumentType;
  rawText: string;
}

export interface OcrExtractionResult {
  documentType: DocumentType;
  valid: boolean;
  fields: {
    name?: string;
    dateOfBirth?: string;
    licenseNumber?: string;
    passportNumber?: string;
    registrationNumber?: string;
  };
  errors: string[];
}

export function extractDocumentFields(input: OcrDocumentInput): OcrExtractionResult {
  const lines = input.rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const errors: string[] = [];
  const fields: OcrExtractionResult["fields"] = {};

  for (const line of lines) {
    if (line.toLowerCase().startsWith("name:")) {
      fields.name = line.split(":").slice(1).join(":").trim();
    } else if (line.toLowerCase().startsWith("dob:")) {
      fields.dateOfBirth = line.split(":").slice(1).join(":").trim();
    } else if (line.toLowerCase().startsWith("license:")) {
      fields.licenseNumber = line.split(":").slice(1).join(":").trim();
    } else if (line.toLowerCase().startsWith("passport:")) {
      fields.passportNumber = line.split(":").slice(1).join(":").trim();
    } else if (line.toLowerCase().startsWith("registration:")) {
      fields.registrationNumber = line.split(":").slice(1).join(":").trim();
    }
  }

  if (input.documentType === "DRIVER_LICENSE" && !fields.licenseNumber) {
    errors.push("Missing license number");
  }

  if (input.documentType === "PASSPORT" && !fields.passportNumber) {
    errors.push("Missing passport number");
  }

  if (input.documentType === "REGISTRATION" && !fields.registrationNumber) {
    errors.push("Missing registration number");
  }

  return {
    documentType: input.documentType,
    valid: errors.length === 0,
    fields,
    errors,
  };
}
