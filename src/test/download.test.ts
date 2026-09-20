import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadUrl, safeFilename } from "@/lib/download";

/**
 * Regression tests for the signing-page download bug (Sept 2026).
 *
 * A blob: URL must never be re-fetched: fetch() on a blob: URL is validated
 * against the page CSP `connect-src`, which blocked every download and PDF
 * preview on firmaclara.es. Anchoring the URL directly avoids the network
 * layer entirely.
 */
describe("downloadUrl", () => {
  let clicked: HTMLAnchorElement[];
  let clickSpy: any;

  beforeEach(() => {
    clicked = [];
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });
    vi.stubGlobal("fetch", vi.fn());
    if (!URL.createObjectURL) {
      vi.stubGlobal("URL", Object.assign(URL, {
        createObjectURL: () => "blob:http://localhost/created",
        revokeObjectURL: () => undefined,
      }));
    }
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("downloads a blob: URL without ever calling fetch", async () => {
    await downloadUrl("blob:http://localhost/abc-123", "contrato.pdf");

    expect(fetch).not.toHaveBeenCalled();
    expect(clicked).toHaveLength(1);
    expect(clicked[0].getAttribute("href")).toBe("blob:http://localhost/abc-123");
    expect(clicked[0].getAttribute("download")).toBe("contrato.pdf");
  });

  it("does not revoke a blob: URL it does not own", async () => {
    const revoke = vi.fn();
    const original = URL.revokeObjectURL;
    URL.revokeObjectURL = revoke;
    vi.useFakeTimers();

    await downloadUrl("blob:http://localhost/owned-by-caller", "doc.pdf");
    vi.advanceTimersByTime(60_000);

    expect(revoke).not.toHaveBeenCalled();
    URL.revokeObjectURL = original;
  });

  it("still fetches http(s) URLs", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    (fetch as any).mockResolvedValue({ ok: true, blob: async () => blob });

    await downloadUrl("https://x.supabase.co/storage/file.pdf", "doc.pdf");

    expect(fetch).toHaveBeenCalledOnce();
    expect(clicked).toHaveLength(1);
  });

  it("throws on a failed http download so callers can toast", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 403 });

    await expect(
      downloadUrl("https://x.supabase.co/storage/file.pdf", "doc.pdf")
    ).rejects.toThrow(/403/);
  });
});

describe("safeFilename", () => {
  it("strips path separators, including backslashes", () => {
    expect(safeFilename("a/b" + "\\" + "c:d*e?f" + '"' + "g<h>i|j")).toBe("a_b_c_d_e_f_g_h_i_j.pdf");
  });

  it("appends .pdf only when missing", () => {
    expect(safeFilename("contrato")).toBe("contrato.pdf");
    expect(safeFilename("contrato.pdf")).toBe("contrato.pdf");
    expect(safeFilename(null)).toBe("documento.pdf");
  });
});
