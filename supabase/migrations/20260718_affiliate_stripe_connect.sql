-- ═══════════════════════════════════════════════════════════════════
-- Afiliados: pago automático mensual vía Stripe Connect
-- El afiliado se da de alta UNA vez como cuenta conectada (Express) y a
-- partir de ahí las comisiones se transfieren solas cada mes.
-- Sustituye al IBAN manual. (Decisión de negocio 2026-07-18)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Cuenta conectada del afiliado.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  -- 'none' = no ha empezado | 'pending' = onboarding incompleto | 'active' = puede cobrar
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'none'
    CHECK (stripe_connect_status IN ('none', 'pending', 'active', 'restricted'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_connect_account
  ON public.users(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- 2. Con Connect ya no se pide IBAN: los pagos van a la cuenta conectada.
--    Se deja la columna por histórico, pero deja de ser obligatoria.
ALTER TABLE public.payout_requests
  ALTER COLUMN iban DROP NOT NULL;

-- 3. Trazabilidad del envío de dinero y del ciclo al que corresponde.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS period_month DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_transfer
  ON public.payout_requests(stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

-- Un único pago automático por afiliado y mes (evita duplicar si el cron
-- se ejecuta dos veces).
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_user_period
  ON public.payout_requests(user_id, period_month)
  WHERE period_month IS NOT NULL;
