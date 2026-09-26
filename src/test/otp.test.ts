import { describe, it, expect } from "vitest";
import { documentRequiresOtp, resolveDeliveredChannel } from "@/lib/otp";

/**
 * Regression tests for the two OTP bugs found in September 2026.
 * See src/lib/otp.ts for the full story.
 */
describe("documentRequiresOtp", () => {
  it("requires a code when the security level says so", () => {
    expect(documentRequiresOtp({ security_level: "whatsapp_otp" })).toBe(true);
  });

  it("requires a code when only the RPC flag arrives", () => {
    // THE BUG: with security_level missing, the page skipped the OTP while the
    // backend still demanded it, making the document impossible to sign.
    expect(documentRequiresOtp({ whatsapp_verification: true })).toBe(true);
    expect(documentRequiresOtp({ security_level: null, whatsapp_verification: true })).toBe(true);
    expect(documentRequiresOtp({ security_level: undefined, whatsapp_verification: true })).toBe(true);
  });

  it("does not require a code for a standard document", () => {
    expect(documentRequiresOtp({ security_level: "standard", whatsapp_verification: false })).toBe(false);
    expect(documentRequiresOtp({ security_level: "standard" })).toBe(false);
    expect(documentRequiresOtp({})).toBe(false);
    expect(documentRequiresOtp(null)).toBe(false);
    expect(documentRequiresOtp(undefined)).toBe(false);
  });

  it("ignores a truthy-but-not-true flag", () => {
    expect(documentRequiresOtp({ whatsapp_verification: "yes" as never })).toBe(false);
  });
});

describe("resolveDeliveredChannel", () => {
  it("shows email when the backend fell back to email", () => {
    expect(resolveDeliveredChannel("sms", "email")).toBe("email");
  });

  it("shows sms when the sms really went out", () => {
    expect(resolveDeliveredChannel("sms", "sms")).toBe("sms");
  });

  it("keeps the requested channel when the backend reports none", () => {
    expect(resolveDeliveredChannel("sms", undefined)).toBe("sms");
    expect(resolveDeliveredChannel("email", null)).toBe("email");
  });

  it("ignores an unexpected value instead of showing nonsense", () => {
    expect(resolveDeliveredChannel("email", "carrier-pigeon")).toBe("email");
    expect(resolveDeliveredChannel("sms", 42)).toBe("sms");
    expect(resolveDeliveredChannel("sms", { channel: "email" })).toBe("sms");
  });
});
