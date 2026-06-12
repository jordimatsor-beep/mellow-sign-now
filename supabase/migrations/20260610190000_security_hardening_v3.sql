-- ============================================================
-- SECURITY HARDENING v3 — 2026-06-10
--
-- Cierra los hallazgos del pentest interno:
--
--  CRIT-1 : Bypass total de créditos. El consumo era client-side y
--           desacoplado del envío; cualquier usuario podía marcar
--           documentos como 'sent' (o INSERTARLOS ya en 'sent') sin
--           gastar crédito. Fix: trigger que impide que un usuario
--           autenticado lleve un documento a 'sent'/'signed' por su
--           cuenta — esas transiciones solo ocurren server-side
--           (service_role en send-invite-v2 / sign-complete-v2, donde
--           auth.uid() es NULL). El cobro pasa a send-invite-v2.
--
--  CRIT-2 : Forja de firmas + bypass de OTP. El RPC submit_signature
--           estaba GRANTeado a anon y aceptaba hash, IP, user_agent y
--           sello TSA como parámetros del cliente, sin exigir OTP. Se
--           elimina por completo: la firma SOLO va por sign-complete-v2
--           (hash y evidencias calculados en servidor, OTP obligatorio).
--
--  MED-5  : Rate-limit de clara-chat era in-memory (por instancia,
--           se reinicia en cada cold start). Se sustituye por un
--           límite durable en DB vía RPC SECURITY DEFINER.
-- ============================================================

BEGIN;

-- ============================================================
-- CRIT-2: Eliminar submit_signature (todas las sobrecargas)
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'submit_signature'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig::text;
  END LOOP;
END $$;

-- ============================================================
-- CRIT-1: Trigger de transición de estado en documents
--
--   • auth.uid() IS NULL  → llamada interna (service_role en edge
--     functions, o RPC SECURITY DEFINER): se permite cualquier
--     transición. Es el único camino para llegar a 'sent'/'signed'.
--   • auth.uid() IS NOT NULL → un usuario real vía RLS:
--       - INSERT: el documento debe nacer como 'draft'.
--       - UPDATE: no puede transicionar a 'sent' ni 'signed'.
--     (Sí puede pasar a 'cancelled', editar borradores, regenerar
--      token/expiry de un envío para reenviarlo, etc.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_document_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Contexto interno (service_role / sin JWT de usuario): sin restricción
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Permission denied: los documentos nuevos deben crearse como draft';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('sent', 'signed') THEN
      RAISE EXCEPTION 'Permission denied: el estado "%" se asigna en servidor', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_document_status ON public.documents;
CREATE TRIGGER trg_guard_document_status
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_document_status();

-- ============================================================
-- MED-5: Rate-limit durable para clara-chat
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clara_usage_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clara_usage_user_time
  ON public.clara_usage_logs(user_id, created_at DESC);

-- RLS activada SIN políticas → ningún cliente (anon/authenticated)
-- puede leer/escribir directamente. Solo la RPC SECURITY DEFINER opera.
ALTER TABLE public.clara_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_clara_rate_limit(
  p_max            integer DEFAULT 20,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.clara_usage_logs
  WHERE user_id = v_user
    AND created_at > now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  INSERT INTO public.clara_usage_logs (user_id) VALUES (v_user);

  -- Limpieza oportunista de filas antiguas de este usuario
  DELETE FROM public.clara_usage_logs
  WHERE user_id = v_user
    AND created_at < now() - interval '1 hour';

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_clara_rate_limit(integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_clara_rate_limit(integer, integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.check_clara_rate_limit(integer, integer) TO service_role;

COMMIT;
