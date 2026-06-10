import { describe, it, expect } from "vitest";
import {
  getOriginalFormat,
  ACCEPTED_OFFICE_FORMATS,
  OFFICE_MIME_TYPES,
} from "@/lib/documentFormats";

describe("getOriginalFormat", () => {
  it("returns the extension for a Word file", () => {
    const file = new File([], "contrato.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(getOriginalFormat(file)).toBe("docx");
  });

  it("returns the extension for an Excel file", () => {
    const file = new File([], "presupuesto.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(getOriginalFormat(file)).toBe("xlsx");
  });

  it("returns null for a PDF file", () => {
    const file = new File([], "documento.pdf", { type: "application/pdf" });
    expect(getOriginalFormat(file)).toBeNull();
  });

  it("returns null for an unknown extension", () => {
    const file = new File([], "archivo.xyz", { type: "application/octet-stream" });
    expect(getOriginalFormat(file)).toBeNull();
  });

  it("is case-insensitive for extensions", () => {
    const file = new File([], "Contrato.DOCX", { type: "" });
    expect(getOriginalFormat(file)).toBe("docx");
  });

  it("handles filenames with multiple dots", () => {
    const file = new File([], "presupuesto.v2.final.pptx", { type: "" });
    expect(getOriginalFormat(file)).toBe("pptx");
  });
});

describe("format constants", () => {
  it("every accepted extension has at least one MIME mapping conceptually", () => {
    // PDF is intentionally excluded from the office lists (it needs no conversion).
    expect(ACCEPTED_OFFICE_FORMATS).not.toContain(".pdf");
    expect(OFFICE_MIME_TYPES).not.toContain("application/pdf");
  });

  it("accepts the core Office formats", () => {
    expect(ACCEPTED_OFFICE_FORMATS).toContain(".docx");
    expect(ACCEPTED_OFFICE_FORMATS).toContain(".xlsx");
    expect(ACCEPTED_OFFICE_FORMATS).toContain(".pptx");
  });
});
