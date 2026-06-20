-- Función admin para vista completa del sistema de referidos
-- Consulta directamente las tablas (no las vistas security_invoker) para
-- que SECURITY DEFINER tenga acceso completo sin restricciones de RLS.

CREATE OR REPLACE FUNCTION public.admin_referral_overview()
RETURNS TABLE (
  user_id          UUID,
  user_email       TEXT,
  user_name        TEXT,
  referral_code    TEXT,
  total_invited    BIGINT,
  total_active     BIGINT,
  credits_earned   BIGINT,
  balance_pending  NUMERIC,
  balance_paid     NUMERIC,
  payout_id        UUID,
  payout_iban      TEXT,
  payout_amount    NUMERIC,
  payout_created   TIMESTAMPTZ,
  payout_notes     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    rc.user_id,
    u.email::TEXT,
    COALESCE(u.name, u.email)::TEXT                                               AS user_name,
    rc.code::TEXT                                                                  AS referral_code,
    -- Invitados (pending + rewarded)
    COUNT(r.id) FILTER (WHERE r.status IN ('pending','rewarded'))::BIGINT         AS total_invited,
    -- Convertidos (primer doc enviado → rewarded)
    COUNT(r.id) FILTER (WHERE r.status = 'rewarded')::BIGINT                      AS total_active,
    -- Créditos que le hemos dado
    COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)::BIGINT AS credits_earned,
    -- Dinero pendiente de pagar (comisiones no cobradas)
    COALESCE(SUM(comm.amount_eur) FILTER (WHERE comm.status = 'pending'), 0)      AS balance_pending,
    -- Dinero ya pagado al afiliado
    COALESCE(SUM(comm.amount_eur) FILTER (WHERE comm.status = 'paid'),    0)      AS balance_paid,
    -- Solicitud de cobro pendiente más reciente (LATERAL)
    pr.id                                                                          AS payout_id,
    pr.iban                                                                        AS payout_iban,
    pr.amount_eur                                                                  AS payout_amount,
    pr.created_at                                                                  AS payout_created,
    pr.notes                                                                       AS payout_notes
  FROM public.referral_codes rc
  JOIN  public.users             u    ON u.id    = rc.user_id
  LEFT JOIN public.referrals     r    ON r.referrer_id = rc.user_id
  LEFT JOIN public.referral_commissions comm ON comm.referrer_id = rc.user_id
  LEFT JOIN LATERAL (
    SELECT id, iban, amount_eur, created_at, notes
    FROM   public.payout_requests
    WHERE  user_id = rc.user_id AND status = 'pending'
    ORDER  BY created_at DESC
    LIMIT  1
  ) pr ON true
  GROUP BY rc.user_id, u.email, u.name, rc.code, pr.id, pr.iban, pr.amount_eur, pr.created_at, pr.notes
  ORDER BY pr.id IS NULL ASC,   -- solicitudes pendientes primero
           balance_pending DESC,
           total_invited DESC,
           rc.created_at DESC;
END;
$$;
