-- HOTFIX: consume_credit leía de user_credit_purchases (todo zeroed tras la migración
-- de pricing del 12-jun). El frontend (rama main) la llama antes de enviar documentos
-- → todos los envíos fallaban con "Insufficient credits" aunque el usuario tuviese
-- créditos en el nuevo sistema (firmas_creditos / cuota mensual).
--
-- Solución: redirigir consume_credit a consumir_firma (nuevo sistema) manteniendo
-- la misma firma y comportamiento externo → 0 cambios en el frontend.

BEGIN;

CREATE OR REPLACE FUNCTION public.consume_credit(
  amount       integer,
  p_description text DEFAULT 'Envío de documento'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be a positive integer';
  END IF;

  -- Delegar al nuevo sistema de créditos
  v_result := public.consumir_firma(
    p_user_id     := NULL,   -- consumir_firma usa auth.uid() si es NULL
    p_document_id := NULL,
    p_description := p_description
  );

  IF NOT (v_result->>'ok')::boolean THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Retorna void como antes
END;
$$;

-- Mantener los mismos permisos que tenía
REVOKE EXECUTE ON FUNCTION public.consume_credit(integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text) TO service_role;

COMMIT;
