/**
 * OTP rules shared by the signing page.
 *
 * Two bugs live here as tests, both found in September 2026:
 *
 *  1. Whether a document needs a code was decided from `security_level` alone
 *     (May 2026). When that value did not reach the page, the signer was never
 *     asked for a code while sign-complete-v2 still required one — signing was
 *     impossible and no OTP was requested for five months.
 *
 *  2. The page showed the channel it ASKED for, not the one the backend
 *     actually used, so signers waited for an SMS while the code sat in their
 *     inbox.
 */

export type OtpChannel = "sms" | "email";

interface OtpDocument {
  security_level?: string | null;
  /** Computed by the signing RPC from the same column, used as a backstop. */
  whatsapp_verification?: boolean | null;
}

/**
 * Whether the document requires an OTP before signing.
 *
 * Both signals are checked on purpose: either one alone is a single point of
 * failure, and the cost of asking for a code that was not needed (a small
 * annoyance) is far lower than blocking a signature entirely.
 */
export const documentRequiresOtp = (doc: OtpDocument | null | undefined): boolean => {
  if (!doc) return false;
  return doc.security_level === "whatsapp_otp" || doc.whatsapp_verification === true;
};

/**
 * Resolves the channel to display from the send-otp response.
 *
 * Falls back to the requested channel when the backend does not report one
 * (older function still deployed), which is the previous behaviour.
 */
export const resolveDeliveredChannel = (requested: OtpChannel, reported: unknown): OtpChannel => {
  if (reported === "email") return "email";
  if (reported === "sms") return "sms";
  return requested;
};
