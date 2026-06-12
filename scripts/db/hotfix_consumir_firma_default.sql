-- HOTFIX: consumir_firma necesita p_user_id con DEFAULT NULL para que
-- PostgREST (send-invite-v2 llama con {p_document_id, p_description}) la encuentre.
-- Sin esto, todos los envíos fallarían con "función no encontrada".
-- DROP + CREATE para garantizar el cambio de default; se re-otorgan permisos.

BEGIN;

DROP FUNCTION IF EXISTS public.consumir_firma(uuid, uuid, text);

CREATE FUNCTION public.consumir_firma(
  p_user_id     uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_description text DEFAULT 'Envío de documento'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid;
  v_u             public.users%ROWTYPE;
  v_plan_efectivo text;
  v_limite        integer;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    p_user_id := v_caller;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'consumir_firma: user id required';
  END IF;

  SELECT * INTO v_u FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'consumir_firma: user not found';
  END IF;

  v_plan_efectivo := v_u.plan_id;
  IF v_u.subscription_status = 'past_due'
     AND v_u.grace_until IS NOT NULL
     AND v_u.grace_until < now() THEN
    v_plan_efectivo := 'gratis';
  END IF;

  v_limite := public.firmas_limite_plan(v_plan_efectivo);

  -- 1) Crédito de pack puntual.
  IF v_u.firmas_creditos > 0 THEN
    UPDATE public.users SET firmas_creditos = firmas_creditos - 1 WHERE id = p_user_id;
    INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
      VALUES (p_user_id, 'usage', -1, p_description, p_document_id, 'credito_pack');
    RETURN jsonb_build_object('ok', true, 'tipo', 'credito_pack',
                              'creditos_restantes', v_u.firmas_creditos - 1);
  END IF;

  -- 2) Cuota mensual del plan.
  IF v_u.firmas_usadas_mes < v_limite THEN
    UPDATE public.users SET firmas_usadas_mes = firmas_usadas_mes + 1 WHERE id = p_user_id;
    INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
      VALUES (p_user_id, 'usage', -1, p_description, p_document_id, 'cuota_plan');
    RETURN jsonb_build_object('ok', true, 'tipo', 'cuota_plan',
                              'usadas', v_u.firmas_usadas_mes + 1, 'limite', v_limite);
  END IF;

  -- 3) Overage solo Profesional al corriente.
  IF v_plan_efectivo = 'profesional' THEN
    UPDATE public.users SET firmas_usadas_mes = firmas_usadas_mes + 1 WHERE id = p_user_id;
    INSERT INTO public.overage_charges (user_id, firma_id, mes_ciclo)
      VALUES (p_user_id, p_document_id, date_trunc('month', now())::date)
      ON CONFLICT (firma_id) DO NOTHING;
    INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
      VALUES (p_user_id, 'usage', -1, p_description, p_document_id, 'overage');
    RETURN jsonb_build_object('ok', true, 'tipo', 'overage',
                              'usadas', v_u.firmas_usadas_mes + 1, 'limite', v_limite);
  END IF;

  -- 4) Bloqueo.
  RETURN jsonb_build_object('ok', false, 'motivo', 'limite_alcanzado',
                            'plan', v_plan_efectivo, 'limite', v_limite);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) TO service_role;

COMMIT;
