-- Migration: webhook_events table for Stripe webhook idempotency and retry
-- Required by: stripe-webhook/index.ts, process-webhook-retries/index.ts

BEGIN;

CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        TEXT UNIQUE NOT NULL,        -- Stripe event ID (idempotency key)
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processed', 'failed', 'dead')),
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ,
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the retry worker: quickly finds failed events ready to retry
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
  ON webhook_events (status, next_retry_at)
  WHERE status = 'failed';

-- Enable RLS — only service_role can access this table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON webhook_events
  USING (auth.role() = 'service_role');

COMMIT;
