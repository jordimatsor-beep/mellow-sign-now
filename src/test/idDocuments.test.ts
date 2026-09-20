import { describe, it, expect } from "vitest";
import {
  ID_DOCUMENT_TYPES,
  DEFAULT_ID_DOCUMENT,
  checkIdDocument,
  formatIdDocument,
  getIdDocumentType,
  isValidCUIT,
  isValidRUT,
  isValidCPF,
} from "@/lib/idDocuments";

describe("checksums", () => {
  it("validates Argentine CUIT/CUIL", () => {
    expect(isValidCUIT("20-12345678-6")).toBe(true);
    expect(isValidCUIT("20123456786")).toBe(true);
    expect(isValidCUIT("20-12345678-5")).toBe(false); // wrong check digit
    expect(isValidCUIT("2012345678")).toBe(false); // too short
  });

  it("validates Chilean RUT including the K check digit", () => {
    expect(isValidRUT("12.345.678-5")).toBe(true);
    expect(isValidRUT("123456785")).toBe(true);
    expect(isValidRUT("12.345.678-9")).toBe(false);
  });

  it("validates Brazilian CPF and rejects repeated digits", () => {
    expect(isValidCPF("123.456.789-09")).toBe(true);
    expect(isValidCPF("123.456.789-10")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });
});

describe("checkIdDocument", () => {
  it("blocks an invalid Spanish document, as it always did", () => {
    const r = checkIdDocument("ES_NIF", "12345678A");
    expect(r.valid).toBe(false);
    expect(r.blocking).toBe(true);
  });

  it("accepts a valid Spanish document", () => {
    expect(checkIdDocument("ES_NIF", "12345678Z")).toMatchObject({ valid: true, blocking: false });
  });

  it("NEVER blocks a foreign document, even when it looks wrong", () => {
    // This is the whole point of the feature: an international signer must not
    // be forced to invent a Spanish NIF to get past the form.
    for (const type of ID_DOCUMENT_TYPES.filter((t) => t.code !== "ES_NIF")) {
      const r = checkIdDocument(type.code, "cualquier-cosa-123");
      expect(r.blocking, `${type.code} must not block`).toBe(false);
    }
  });

  it("warns (without blocking) on a malformed CUIT", () => {
    const r = checkIdDocument("AR_CUIT", "20-12345678-5");
    expect(r.valid).toBe(false);
    expect(r.blocking).toBe(false);
    expect(r.message).toContain("Argentina");
  });

  it("accepts free-form documents like passports", () => {
    expect(checkIdDocument("PASSPORT", "ABC123456")).toMatchObject({ valid: true });
    expect(checkIdDocument("OTHER", "X/123.456")).toMatchObject({ valid: true });
  });

  it("treats an empty value as valid (the form decides if it is required)", () => {
    expect(checkIdDocument("ES_NIF", "")).toMatchObject({ valid: true, blocking: false });
    expect(checkIdDocument("AR_CUIT", "   ")).toMatchObject({ valid: true });
  });

  it("falls back to the Spanish document for legacy rows with no type", () => {
    expect(getIdDocumentType(null).code).toBe(DEFAULT_ID_DOCUMENT);
    expect(getIdDocumentType(undefined).code).toBe(DEFAULT_ID_DOCUMENT);
    expect(getIdDocumentType("UNKNOWN_CODE").code).toBe(DEFAULT_ID_DOCUMENT);
    // Legacy documents keep behaving exactly as before the feature.
    expect(checkIdDocument(null, "12345678A").blocking).toBe(true);
  });
});

describe("formatIdDocument", () => {
  it("labels the number with its document type", () => {
    expect(formatIdDocument("AR_CUIT", "20-12345678-6")).toBe("CUIT / CUIL: 20-12345678-6");
    expect(formatIdDocument("ES_NIF", "12345678Z")).toBe("NIF / NIE / CIF: 12345678Z");
    expect(formatIdDocument("PASSPORT", " ABC123 ")).toBe("Pasaporte: ABC123");
  });

  it("returns an empty string when there is no number", () => {
    expect(formatIdDocument("ES_NIF", null)).toBe("");
    expect(formatIdDocument("ES_NIF", "  ")).toBe("");
  });
});
