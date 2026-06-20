-- Sistema de comisiones de afiliado — 20% de cualquier compra del referido

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_eur      NUMERIC(10,2) NOT NULL,
  percentage      INT         NOT NULL DEFAULT 20,
  purchase_eur    NUMERIC(10,2) NOT NULL,
  product         TEXT        NOT NULL,
  stripe_session  TEXT        NOT NULL UNIQUE,
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ref_comm_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_comm_referred  ON public.referral_commissions(referred_id);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_eur   NUMERIC(10,2) NOT NULL,
  iban         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','rejected')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payout_user ON public.payout_requests(user_id);

-- RLS
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer sees own commissions"
  ON public.referral_commissions FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Service full commissions"
  ON public.referral_commissions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "User sees own payouts"
  ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User inserts own payouts"
  ON public.payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service full payouts"
  ON public.payout_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Vista: saldo de comisiones por usuario
CREATE OR REPLACE VIEW public.referral_commission_balance
WITH (security_invoker = true) AS
SELECT
  referrer_id                                               AS user_id,
  COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'), 0)  AS balance_pending,
  COALESCE(SUM(amount_eur) FILTER (WHERE status = 'paid'),    0)  AS balance_paid,
  COALESCE(SUM(amount_eur),                                   0)  AS balance_total,
  COUNT(*)  FILTER (WHERE status = 'pending')                     AS commissions_pending,
  COUNT(*)                                                        AS commissions_total
FROM public.referral_commissions
GROUP BY referrer_id;
