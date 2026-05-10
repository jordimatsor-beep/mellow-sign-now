-- Migration: email_queue table for reliable email delivery with retry
-- Required by: _shared/emailQueue.ts, process-email-queue/index.ts

BEGIN;

CREATE TABLE IF NOT EXISTS email_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type   TEXT NOT NULL
                    CHECK (template_type IN ('document_invitation', 'signed_notification', 'reminder', 'otp')),
  to_email        TEXT NOT NULL,
  to_name         TEXT,
  subject         TEXT NOT NULL,
  html_body       TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'failed', 'dead')),
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ DEFAULT NOW(),  -- immediately eligible on creation
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the queue worker: pending/failed emails due for processing
CREATE INDEX IF NOT EXISTS idx_email_queue_processing
  ON email_queue (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

-- Enable RLS — only service_role can access
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON email_queue
  USING (auth.role() = 'service_role');

COMMIT;
