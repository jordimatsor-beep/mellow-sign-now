-- ============================================================
-- 2026-06-09 — Créditos API + reembolso real + cierre de seguridad
--
-- 1) refund_credit(): el rollback del frontend llamaba a
--    consume_credit con amount = -1, bloqueado (correctamente) por el
--    fix de seguridad del 2026-05-25 y con un nombre de parámetro que
--    no existía → el reembolso al fallar el envío de email NUNCA
--    funcionó. Esta función lo implementa de forma segura.
-- 2) api_clients.user_id: vincula cada cliente API a la cuenta que
--    posee los créditos. documents.api_client_id para ownership.
-- 3) consume_credit_for_user(): variante solo-service_role para que
--    la API signature-requests consuma créditos del usuario vinculado.
-- 4) Desactiva el cliente 'nexo' hasta rotar su API key (estuvo en
--    claro en el repo — ver scripts/db/setup_api_client.sql).
-- ============================================================

BEGIN;

-- ── 1) Reembolso de 1 crédito para el propio usuario ──────────────
CREATE OR REPLACE FUNCTION public.refund_credit(
  p_description text DEFAULT 'Reembolso por fallo de envío'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_net     integer;
  v_rows    integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Anti-abuso: solo se devuelve si hay consumo neto reciente
  -- (usage almacena amount negativo; refund, positivo).
  SELECT COALESCE(-SUM(amount), 0) INTO v_net
  FROM public.credit_transactions
  WHERE user_id = v_user_id
    AND type IN ('usage', 'refund')
    AND created_at > now() - interval '10 minutes';

  IF v_net < 1 THEN
    RAISE EXCEPTION 'No recent consumption to refund';
  END IF;

  UPDATE public.user_credit_purchases
  SET credits_used = credits_used - 1,
      updated_at   = now()
  WHERE id = (
    SELECT id
    FROM public.user_credit_purchases
    WHERE user_id = v_user_id
      AND credits_used > 0
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Nothing to refund';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'refund', 1, p_description);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_credit(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.refund_credit(text) TO authenticated;

-- ── 2) Vinculación de clientes API ─────────────────────────────────
ALTER TABLE public.api_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.api_clients.user_id IS
  'Cuenta FirmaClara propietaria: sus créditos se consumen en cada solicitud API';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS api_client_id UUID REFERENCES public.api_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_api_client ON public.documents(api_client_id);

-- ── 3) Consumo de crédito en nombre de un usuario (solo service_role)
CREATE OR REPLACE FUNCTION public.consume_credit_for_user(
  p_user_id     uuid,
  p_description text DEFAULT 'Solicitud de firma vía API'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.user_credit_purchases
  SET credits_used = credits_used + 1,
      updated_at   = now()
  WHERE id = (
    SELECT id
    FROM public.user_credit_purchases
    WHERE user_id = p_user_id
      AND (credits_total - credits_used) >= 1
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'usage', -1, p_description);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) TO service_role;

-- ── 4) Desactivar el cliente con clave comprometida hasta rotarla ──
UPDATE public.api_clients SET active = false WHERE name = 'nexo';

COMMIT;
