-- 2026-06-22: Add email to anon_referral_sessions for cross-device attribution.
-- When the user fills the registration form, their email is linked to the pending session.
-- This allows register-referral to match the referral even from a different device.

ALTER TABLE public.anon_referral_sessions
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Case-insensitive lookup by email for the cross-device fallback
CREATE INDEX IF NOT EXISTS idx_anon_referral_sessions_email
  ON public.anon_referral_sessions(lower(email))
  WHERE consumed_at IS NULL AND email IS NOT NULL;
