-- Migration: Cleanup legacy fields and unify credit tables
-- NOTE: user_credit_purchases is the canonical table (stripe-webhook writes here).
--       credit_packs becomes a VIEW for backward compat with legacy code.
--       (Codex's original had the direction inverted — this version is correct.)

-- =====================================================
-- PART 1: Document fields cleanup
-- =====================================================

BEGIN;

-- Migrate whatsapp_verification boolean → security_level enum
UPDATE documents
SET security_level = 'whatsapp_otp'
WHERE whatsapp_verification = true
  AND (security_level IS NULL OR security_level = 'standard');

-- Guard: add CHECK constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_security_level' AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT chk_security_level
      CHECK (security_level IN ('standard', 'whatsapp_otp', 'email_otp', 'sms_otp'));
  END IF;
END $$;

-- Drop legacy boolean columns (safe: data already migrated above)
ALTER TABLE documents DROP COLUMN IF EXISTS whatsapp_verification;
ALTER TABLE documents DROP COLUMN IF EXISTS whatsapp_verification_status;

-- Document position columns — clarifying comments
COMMENT ON COLUMN documents.signature_page IS
  'Target page for signature: 0 = new page appended, -1 = last page, N = specific page';
COMMENT ON COLUMN documents.signature_x IS
  'X coordinate in PDF points (72 pts = 1 inch). Only used when signature_page >= 1.';
COMMENT ON COLUMN documents.signature_y IS
  'Y coordinate in PDF points from bottom. Only used when signature_page >= 1.';

COMMIT;

-- =====================================================
-- PART 2: Credit tables — make user_credit_purchases canonical
-- =====================================================

BEGIN;

-- Ensure user_credit_purchases has all columns that credit_packs may have
ALTER TABLE user_credit_purchases ADD COLUMN IF NOT EXISTS stripe_session_id  TEXT;
ALTER TABLE user_credit_purchases ADD COLUMN IF NOT EXISTS stripe_payment_id  TEXT;
ALTER TABLE user_credit_purchases ADD COLUMN IF NOT EXISTS price_paid         NUMERIC(10,2);
ALTER TABLE user_credit_purchases ADD COLUMN IF NOT EXISTS purchased_at       TIMESTAMPTZ DEFAULT NOW();

-- Copy any rows from credit_packs that are NOT yet in user_credit_purchases
-- Match by stripe_session_id (NULL-safe: only copy where session_id exists in both)
INSERT INTO user_credit_purchases (
  user_id, pack_type, credits_total, credits_used,
  stripe_session_id, stripe_payment_id, created_at
)
SELECT
  cp.user_id, cp.pack_type, cp.credits_total, cp.credits_used,
  cp.stripe_session_id, cp.stripe_payment_id, cp.created_at
FROM credit_packs cp
WHERE cp.stripe_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_credit_purchases ucp
    WHERE ucp.stripe_session_id = cp.stripe_session_id
  );

-- Copy trial/admin packs (no stripe_session_id) that aren't already migrated
INSERT INTO user_credit_purchases (
  user_id, pack_type, credits_total, credits_used, created_at
)
SELECT
  cp.user_id, cp.pack_type, cp.credits_total, cp.credits_used, cp.created_at
FROM credit_packs cp
WHERE cp.stripe_session_id IS NULL
  AND cp.pack_type IN ('trial', 'admin_grant')
  AND NOT EXISTS (
    SELECT 1 FROM user_credit_purchases ucp
    WHERE ucp.user_id = cp.user_id
      AND ucp.pack_type = cp.pack_type
      AND ucp.created_at = cp.created_at
  );

-- Rename credit_packs to _deprecated (keep as backup for 30 days)
ALTER TABLE credit_packs RENAME TO credit_packs_deprecated;

-- Create credit_packs as a VIEW of user_credit_purchases for backward compat
-- (read-only; any code still reading credit_packs will continue to work)
CREATE OR REPLACE VIEW credit_packs AS
  SELECT * FROM user_credit_purchases;

-- Add unique constraint on stripe_payment_id for upsert idempotency (used by stripe-webhook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_user_credit_purchases_payment_id'
      AND conrelid = 'user_credit_purchases'::regclass
  ) THEN
    ALTER TABLE user_credit_purchases
      ADD CONSTRAINT uq_user_credit_purchases_payment_id
      UNIQUE (stripe_payment_id);
  END IF;
END $$;

COMMIT;

-- =====================================================
-- PART 3: Performance indexes
-- =====================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_documents_user_status_created
  ON documents (user_id, status, created_at DESC);

-- Partial: sign_token lookups only matter for unsigned documents
CREATE INDEX IF NOT EXISTS idx_documents_sign_token_active
  ON documents (sign_token)
  WHERE status NOT IN ('signed', 'cancelled', 'expired');

CREATE INDEX IF NOT EXISTS idx_event_logs_user_created
  ON event_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_logs_document_created
  ON event_logs (document_id, created_at DESC);

-- Partial: only index packs with credits remaining (used by get_available_credits)
CREATE INDEX IF NOT EXISTS idx_user_credit_purchases_user_active
  ON user_credit_purchases (user_id)
  WHERE credits_used < credits_total;

COMMIT;

-- =====================================================
-- Verification (run manually after applying)
-- =====================================================
-- SELECT security_level, COUNT(*) FROM documents GROUP BY 1;
-- SELECT COUNT(*) FROM user_credit_purchases;
-- SELECT COUNT(*) FROM credit_packs_deprecated;
-- SELECT COUNT(*) FROM credit_packs;  -- should match user_credit_purchases count
