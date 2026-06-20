-- Fixes al sistema de comisiones de afiliado

-- ── FIX 1: Trigger que marca comisiones como pagadas cuando el payout se paga ──
-- Cuando Jordi marca un payout_request como 'paid', todas las referral_commissions
-- con status='pending' y created_at <= payout.created_at se marcan como 'paid'.

CREATE OR REPLACE FUNCTION public.sync_commissions_on_payout_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el status pasa de cualquier estado a 'paid'
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.referral_commissions
    SET    status   = 'paid',
           paid_at  = now()
    WHERE  referrer_id = NEW.user_id
      AND  status      = 'pending'
      AND  created_at  <= NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payout_paid_sync_commissions ON public.payout_requests;
CREATE TRIGGER payout_paid_sync_commissions
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_commissions_on_payout_paid();

-- ── FIX 2: Corregir vista balance — excluir cancelled del total ──────────────
CREATE OR REPLACE VIEW public.referral_commission_balance
WITH (security_invoker = true) AS
SELECT
  referrer_id                                                                          AS user_id,
  COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'),              0)         AS balance_pending,
  COALESCE(SUM(amount_eur) FILTER (WHERE status = 'paid'),                 0)         AS balance_paid,
  COALESCE(SUM(amount_eur) FILTER (WHERE status IN ('pending', 'paid')),   0)         AS balance_total,
  COUNT(*)             FILTER (WHERE status = 'pending')                               AS commissions_pending,
  COUNT(*)             FILTER (WHERE status IN ('pending', 'paid'))                    AS commissions_total
FROM public.referral_commissions
GROUP BY referrer_id;

-- ── FIX 3: Stripe usa amount_subtotal (precio sin IVA) para comisiones ───────
-- No hay cambio en BD — se aplica en el stripe-webhook cambiando amount_total
-- por amount_subtotal al calcular la comisión. Ver stripe-webhook/index.ts.

-- ── INFO: Cómo marcar un payout como pagado (ejecutar en SQL editor) ─────────
-- UPDATE public.payout_requests
--   SET status='paid', resolved_at=now(), notes='Transferencia SEPA ref. XXXXXXXX'
--   WHERE id='<uuid-del-payout>';
-- El trigger anterior se encargará de marcar las comisiones automáticamente.
