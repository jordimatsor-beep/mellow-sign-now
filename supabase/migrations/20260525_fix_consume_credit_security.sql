-- ============================================================
-- SECURITY FIX: consume_credit — dos vulnerabilidades críticas
--
--  CRIT-A: Cantidad negativa → cualquier usuario autenticado podía
--          llamar supabase.rpc('consume_credit', {amount: -100}) para
--          SUMAR créditos gratis (credits_used -= 100 = saldo libre).
--          Fix: Validar amount > 0 antes de cualquier operación.
--
--  CRIT-B: Race condition → dos peticiones simultáneas podían pasar
--          el check de saldo y ambas descontar, generando credits_used
--          > credits_total (saldo negativo / doble gasto).
--          Fix: Añadir re-check condicional en el propio UPDATE y
--          verificar rows_affected = 1; si es 0 → saldo insuficiente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_credit(
  amount        integer,
  p_description text DEFAULT 'Envío de documento'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id    uuid;
  v_rows       integer;
BEGIN
  -- Autenticación
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- CRIT-A FIX: Rechazar cantidades inválidas antes de tocar la DB
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be a positive integer';
  END IF;

  -- CRIT-B FIX: UPDATE atómico con re-check en la cláusula WHERE.
  --   • La subquery con FOR UPDATE bloquea la fila elegida antes de
  --     que ninguna otra transacción pueda leerla/modificarla.
  --   • La condición (credits_total - credits_used) >= amount en el
  --     UPDATE garantiza que incluso si otra transacción ganó la
  --     carrera, este UPDATE no se aplicará y rows = 0.
  --   • No se hace SELECT previo de saldo: evita el TOCTOU.
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
    FOR UPDATE SKIP LOCKED       -- lock atómico; descarta filas ya bloqueadas
  );

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Registrar transacción (solo si el UPDATE tuvo efecto)
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'usage', -amount, p_description);

END;
$function$;

-- Asegurar que solo usuarios autenticados pueden invocarla
REVOKE EXECUTE ON FUNCTION public.consume_credit(integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text) TO service_role;
