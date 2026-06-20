-- Rate limiting para register-referral (I4)
-- Tabla de contadores por IP+minuto. Sin RLS: solo accede la función SECURITY DEFINER.
CREATE TABLE IF NOT EXISTS public.referral_rl (
  ip     TEXT        NOT NULL,
  minute TIMESTAMPTZ NOT NULL,
  hits   INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, minute)
);

-- Autovacuum agresivo: las filas viejas son basura, limpiar rápido
ALTER TABLE public.referral_rl SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold    = 10
);

-- Función atómica: upsert + retorna hits actuales en el minuto actual
CREATE OR REPLACE FUNCTION public.check_referral_rl(p_ip TEXT, p_max INT DEFAULT 20)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute TIMESTAMPTZ := date_trunc('minute', now());
  v_hits   INT;
BEGIN
  -- Limpiar filas > 10 minutos antes de insertar (lazy cleanup)
  DELETE FROM public.referral_rl WHERE minute < now() - INTERVAL '10 minutes';

  INSERT INTO public.referral_rl (ip, minute, hits)
  VALUES (p_ip, v_minute, 1)
  ON CONFLICT (ip, minute) DO UPDATE
    SET hits = referral_rl.hits + 1
  RETURNING hits INTO v_hits;

  RETURN v_hits;
END;
$$;
