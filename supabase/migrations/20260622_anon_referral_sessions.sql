-- 2026-06-22: Server-side referral session tracking
-- Captures referral intent in the DB before registration.
-- The client stores only an opaque session_id (UUID); the actual ref_code never leaves the server.

CREATE TABLE public.anon_referral_sessions (
  session_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '90 days',
  consumed_at  TIMESTAMPTZ,
  new_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_prefix    TEXT        -- /24 prefix only (GDPR-friendly, for rate-limit / anti-fraud)
);

-- Efficient cleanup of expired unclaimed sessions
CREATE INDEX idx_anon_referral_sessions_expires
  ON public.anon_referral_sessions(expires_at)
  WHERE consumed_at IS NULL;

-- All operations go through the service-role edge functions; no direct client access
ALTER TABLE public.anon_referral_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.anon_referral_sessions IS
  'Server-side referral intent. Created on first visit via referral link. Consumed at registration by register-referral edge function.';
