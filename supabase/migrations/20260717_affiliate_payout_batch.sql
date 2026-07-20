-- ═══════════════════════════════════════════════════════════════════
-- Afiliados: cálculo mensual del lote de pagos (rail-agnóstico)
-- Devuelve, por afiliado, su SALDO NETO pendiente (comisiones − ajustes)
-- y si alcanza el mínimo para cobrar. El rollover es implícito: quien no
-- llega al mínimo simplemente no es 'eligible' y sus comisiones siguen
-- 'pending' para el mes siguiente, acumulándose.
--
-- Esta función NO mueve dinero ni crea payout_requests: eso lo hará el
-- proceso del rail elegido (Stripe Connect o fichero SEPA) una vez decidido.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_affiliate_payout_batch(p_min_eur NUMERIC DEFAULT 15)
RETURNS TABLE(
  user_id     UUID,
  net_pending NUMERIC,   -- saldo neto pendiente (ya resta ajustes por reembolso/disputa)
  eligible    BOOLEAN    -- true si net_pending >= mínimo
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
  GROUP BY referrer_id
  HAVING COALESCE(SUM(amount_eur) FILTER (WHERE status = 'pending'), 0) <> 0;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_payout_batch(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_payout_batch(NUMERIC) TO service_role;
