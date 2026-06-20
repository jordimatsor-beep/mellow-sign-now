-- Fixes al sistema de referidos (post code-review)
-- C1: Asegurar que referrals está en la publicación de Realtime (idempotente)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- I3: total_invited excluía correctamente activos y pendientes pero incluía 'invalid'.
-- Un referido 'invalid' completó el proceso (registró y envió doc) pero el referidor
-- ya había alcanzado el cap. El contador ahora solo cuenta pending + rewarded.
CREATE OR REPLACE VIEW public.referral_stats
WITH (security_invoker = true)
AS
SELECT
  r.referrer_id                                                                    AS user_id,
  COUNT(*) FILTER (WHERE r.status IN ('pending', 'rewarded'))                     AS total_invited,
  COUNT(*) FILTER (WHERE r.status = 'pending')                                    AS total_pending,
  COUNT(*) FILTER (WHERE r.status = 'rewarded')                                   AS total_active,
  COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)   AS credits_earned,
  GREATEST(0, 50 - COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)) AS credits_remaining
FROM public.referrals r
GROUP BY r.referrer_id;
