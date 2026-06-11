-- ============================================================
-- QW-03 · Vincular el historial de créditos al documento enviado
--
--  • consume_credit gana un tercer parámetro opcional p_document_id y lo
--    guarda en la transacción, para que el débito quede ligado al documento
--    concreto que lo originó.
--  • get_credit_transactions devuelve además el título del documento
--    (LEFT JOIN), para poder enlazarlo en el historial. Si el documento se
--    borró (document_id quedó NULL por ON DELETE SET NULL), el título viene
--    NULL y el frontend lo muestra como texto plano sin enlace.
--
--  Tras aplicar esta migración hay que redeployar la edge function
--  send-invite-v2 (pasa ahora p_document_id).
-- ============================================================

BEGIN;

-- ── consume_credit ────────────────────────────────────────────────────────
-- Se eliminan las sobrecargas anteriores para evitar ambigüedad de resolución
-- (una llamada con 1 arg sería ambigua entre la versión de 2 y la de 3 args).
DROP FUNCTION IF EXISTS public.consume_credit(integer);
DROP FUNCTION IF EXISTS public.consume_credit(integer, text);

CREATE OR REPLACE FUNCTION public.consume_credit(
  amount        integer,
  p_description text DEFAULT 'Envío de documento',
  p_document_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_rows    integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- CRIT-A: rechazar cantidades inválidas antes de tocar la DB.
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be a positive integer';
  END IF;

  -- CRIT-B: UPDATE atómico con re-check en el WHERE + lock FIFO de la fila.
  UPDATE public.user_credit_purchases
  SET credits_used = credits_used + amount,
      updated_at   = now()
  WHERE id = (
    SELECT id
    FROM public.user_credit_purchases
    WHERE user_id = v_user_id
      AND (credits_total - credits_used) >= amount
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  );

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Registrar la transacción ligada al documento (si se proporcionó).
  INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id)
  VALUES (v_user_id, 'usage', -amount, p_description, p_document_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) TO service_role;

-- ── get_credit_transactions ───────────────────────────────────────────────
-- Cambia el conjunto de columnas devueltas → hay que DROP + CREATE.
DROP FUNCTION IF EXISTS public.get_credit_transactions(integer);

CREATE OR REPLACE FUNCTION public.get_credit_transactions(p_limit integer DEFAULT 20)
RETURNS TABLE(
  id             uuid,
  type           text,
  amount         integer,
  description    text,
  document_id    uuid,
  document_title text,
  created_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.type,
    ct.amount,
    ct.description,
    ct.document_id,
    d.title AS document_title,
    ct.created_at
  FROM public.credit_transactions ct
  LEFT JOIN public.documents d ON d.id = ct.document_id
  WHERE ct.user_id = auth.uid()
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_credit_transactions(integer) TO authenticated;

COMMIT;
