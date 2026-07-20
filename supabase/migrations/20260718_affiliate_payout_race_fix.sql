-- ═══════════════════════════════════════════════════════════════════
-- FIX de condición de carrera en el pago mensual de comisiones
--
-- PROBLEMA: el motor leía el saldo y DESPUÉS insertaba el pago. El trigger
-- sync_commissions_on_payout_paid marcaba como pagadas todas las comisiones
-- con created_at <= payout.created_at. Una comisión creada JUSTO entre la
-- lectura del saldo y la inserción del pago quedaba marcada como pagada
-- SIN haber sido incluida en el importe transferido → el afiliado la perdía.
--
-- SOLUCIÓN: un corte temporal explícito (cutoff) fijado ANTES de leer el
-- saldo. Tanto el cálculo como el marcado usan ese mismo instante, así que
-- lo que entra en el importe es exactamente lo que se marca como pagado.
-- Lo que llegue después queda pendiente para el mes siguiente.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Guardar el corte usado en cada pago.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS cutoff_at TIMESTAMPTZ;

-- 2. El cálculo del lote ahora respeta el corte.
DROP FUNCTION IF EXISTS public.get_affiliate_payout_batch(NUMERIC);

CREATE OR REPLACE FUNCTION public.get_affiliate_payout_batch(
  p_min_eur NUMERIC     DEFAULT 15,
  p_cutoff  TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  user_id     UUID,
  net_pending NUMERIC,
  eligible    BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    referrer_id                                                      AS user_id,
    COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'), 0)   AS net_pending,
    COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'), 0) >= p_min_eur AS eligible
  FROM public.referral_commissions
  WHERE created_at <= p_cutoff
  GROUP BY referrer_id
  HAVING COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'), 0) <> 0;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_payout_batch(NUMERIC, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_payout_batch(NUMERIC, TIMESTAMPTZ) TO service_role;

-- 3. El marcado usa el mismo corte (con fallback al comportamiento anterior
--    para pagos manuales antiguos que no tienen cutoff_at).
CREATE OR REPLACE FUNCTION public.sync_commissions_on_payout_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    UPDATE public.referral_commissions
    SET    status   = 'paid',
           paid_at  = now()
    WHERE  referrer_id = NEW.user_id
      AND  status      = 'pending'
      AND  created_at  <= COALESCE(NEW.cutoff_at, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$;
