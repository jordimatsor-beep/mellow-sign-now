-- ============================================
-- MIGRATION: Stripe Idempotency [P1]
-- DATE: 2026-01-21
-- ============================================

-- P1: DB-level Idempotency
-- Ensure that the same Stripe Payment Intent cannot be recorded twice.

DO $$
BEGIN
    -- Check if index/constraint already exists to avoid error
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_packs_stripe_payment_id_key') THEN
        ALTER TABLE public.credit_packs ADD CONSTRAINT credit_packs_stripe_payment_id_key UNIQUE (stripe_payment_id);
    END IF;
END $$;
