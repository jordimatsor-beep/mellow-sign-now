-- ═══════════════════════════════════════════════════════════════════
-- Afiliados: ajustes por reembolso / disputa (contracargo)
-- Un reembolso posterior al pago de una comisión NO se reclama al afiliado:
-- se crea una comisión NEGATIVA (kind='adjustment') que resta de su saldo
-- futuro y se arrastra mes a mes hasta compensarse.
-- (Decisión de negocio 2026-07-17 — acuerdo Conektium)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tipo de fila: comisión normal (+) o ajuste por devolución (−).
ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'commission'
  CHECK (kind IN ('commission', 'adjustment'));

-- 2. Referencia para mapear un reembolso/disputa de Stripe con su comisión origen.
--    Suscripciones → invoice.id ; packs → payment_intent.
ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS refund_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_ref_comm_refund_ref
  ON public.referral_commissions(refund_ref);

-- 3. amount_eur ya es NUMERIC sin CHECK de positividad → admite importes negativos
--    para los ajustes. La vista referral_commission_balance suma amount_eur, así que
--    un ajuste negativo 'pending' reduce automáticamente balance_pending y balance_total.
--    No hace falta tocar la vista.

-- NOTA: la idempotencia sigue garantizada por el UNIQUE de stripe_session.
--   • comisión de factura   → stripe_session = invoice.id
--   • comisión de pack      → stripe_session = checkout_session.id
--   • ajuste por reembolso  → stripe_session = 'refund:'  || <ref>
--   • ajuste por disputa    → stripe_session = 'dispute:' || <ref>
