import { describe, it, expect, vi } from "vitest";
import { writeWithOptionalColumns, isUnknownColumnError } from "@/integrations/supabase/optionalColumns";

const PAYLOAD = { title: "Contrato", signer_tax_id: "20-12345678-6", signer_tax_id_type: "AR_CUIT" };
const MISSING = {
  code: "PGRST204",
  message: "Could not find the 'signer_tax_id_type' column of 'documents' in the schema cache",
};

describe("isUnknownColumnError", () => {
  it("recognises PostgREST and Postgres missing-column errors", () => {
    expect(isUnknownColumnError(MISSING, ["signer_tax_id_type"])).toBe(true);
    expect(
      isUnknownColumnError({ code: "42703", message: 'column "nif_type" does not exist' }, ["nif_type"])
    ).toBe(true);
  });

  it("does not swallow unrelated failures", () => {
    // A different column, a different error code, or no error at all must not
    // be mistaken for "the migration is pending".
    expect(isUnknownColumnError({ code: "PGRST204", message: "'other_col' column" }, ["nif_type"])).toBe(false);
    expect(isUnknownColumnError({ code: "23505", message: "duplicate key" }, ["nif_type"])).toBe(false);
    expect(isUnknownColumnError({ code: "42501", message: "permission denied" }, ["nif_type"])).toBe(false);
    expect(isUnknownColumnError(null, ["nif_type"])).toBe(false);
  });
});

describe("writeWithOptionalColumns", () => {
  it("writes with the column when the database has it", async () => {
    const write = vi.fn().mockResolvedValue({ data: { id: "1" }, error: null });

    const result = await writeWithOptionalColumns(PAYLOAD, ["signer_tax_id_type"], write);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(PAYLOAD);
    expect(result.error).toBeNull();
  });

  it("retries without the column when the migration is still pending", async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: MISSING })
      .mockResolvedValueOnce({ data: { id: "1" }, error: null });
    const onDegraded = vi.fn();

    const result = await writeWithOptionalColumns(PAYLOAD, ["signer_tax_id_type"], write, onDegraded);

    expect(write).toHaveBeenCalledTimes(2);
    // The document is still created — only the new field is dropped.
    expect(write).toHaveBeenLastCalledWith({ title: "Contrato", signer_tax_id: "20-12345678-6" });
    expect(result.error).toBeNull();
    expect(onDegraded).toHaveBeenCalledOnce();
  });

  it("does not retry, and surfaces the error, on a real failure", async () => {
    const realError = { code: "23505", message: "duplicate key value" };
    const write = vi.fn().mockResolvedValue({ data: null, error: realError });

    const result = await writeWithOptionalColumns(PAYLOAD, ["signer_tax_id_type"], write);

    expect(write).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(realError);
  });

  it("leaves the caller's payload untouched", async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: MISSING })
      .mockResolvedValueOnce({ data: null, error: null });
    const payload = { ...PAYLOAD };

    await writeWithOptionalColumns(payload, ["signer_tax_id_type"], write);

    expect(payload).toEqual(PAYLOAD);
  });
});
