-- Performance indexes — 2026-06-21
-- Fixes: separate user_id + created_at indexes don't help ORDER BY; contacts had no index.

-- 1. Documents: main list query is user_id + is_template=false + ORDER BY created_at DESC.
--    The existing idx_documents_user_id and idx_documents_created_at are separate — Postgres
--    can't combine them efficiently for this pattern. A composite replaces both for this query.
CREATE INDEX IF NOT EXISTS idx_documents_user_created
  ON public.documents(user_id, created_at DESC)
  WHERE is_template = false;

-- 2. Contacts: no indexes existed on this table.
--    Query: WHERE user_id = $1 ORDER BY name  (contacts list page)
CREATE INDEX IF NOT EXISTS idx_contacts_user_name
  ON public.contacts(user_id, name);

-- 3. Credit transactions: history page queries user_id ORDER BY created_at DESC.
--    Replaces the pair idx_credit_transactions_user_id + idx_credit_transactions_created_at.
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON public.credit_transactions(user_id, created_at DESC);

-- 4. Event logs: document detail loads events for a document ordered by time.
--    Composite replaces the pair idx_event_logs_document_id + idx_event_logs_created_at.
CREATE INDEX IF NOT EXISTS idx_event_logs_document_created
  ON public.event_logs(document_id, created_at ASC);

-- 5. Referrals: /invita page lists referrals for a referrer ordered by date.
--    idx_referrals_referrer_id already exists; add created_at to avoid a sort step.
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON public.referrals(referrer_id, created_at DESC);
