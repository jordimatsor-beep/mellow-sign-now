-- Migration: api_clients table for external integrations (e.g. Nexo)
-- Stores API keys and webhook endpoints per client application.
--
-- SECURITY NOTE (2026-06-09): this migration originally contained the raw
-- API key and webhook secret for the 'nexo' client in plaintext on disk
-- (it was never pushed to git). Rotate them anyway: they were exposed
-- outside the secrets manager. Seed/rotate clients with
-- scripts/db/setup_api_client.sql — never put raw secrets in migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS api_clients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL UNIQUE,          -- e.g. 'nexo'
  api_key_hash      TEXT        NOT NULL UNIQUE,          -- SHA-256 of the raw API key
  webhook_url       TEXT,                                 -- where to POST signed events
  webhook_secret    TEXT        NOT NULL,                 -- HMAC-SHA256 signing secret
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

-- Only service_role may read this table (secrets inside)
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON api_clients;
CREATE POLICY "service_role_only" ON api_clients
  USING (auth.role() = 'service_role');

COMMIT;
