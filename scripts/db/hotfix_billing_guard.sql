-- HOTFIX SEGURIDAD: impedir que un usuario 'authenticated' modifique sus
-- propios campos de facturación (plan_id, firmas_creditos, firmas_usadas_mes,
-- stripe_*, subscription_status, grace_until, plan_renewed_at) vía un UPDATE
-- directo de PostgREST. La RLS solo comprobaba auth.uid()=id y el guard previo
-- (lista negra) no cubría estas columnas → escalada de privilegios.
--
-- Mecánica: las funciones de confianza (SECURITY DEFINER) marcan un flag
-- transaccional app.billing_ctx='on'; el webhook usa service_role. El guard
-- bloquea cambios en columnas de facturación salvo admin / service_role / flag.

BEGIN;

-- ── Guard extendido ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_trusted  BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();
  -- Contexto de confianza: webhook (service_role) o función de facturación
  -- SECURITY DEFINER que marcó el flag transaccional.
  v_trusted := COALESCE(auth.role(), '') = 'service_role'
            OR COALESCE(current_setting('app.billing_ctx', true), '') = 'on';

  -- role
  IF NOT v_is_admin AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: cannot modify role';
  END IF;

  -- email / id / created_at
  IF NOT v_is_admin THEN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Permission denied: cannot modify email';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Permission denied: cannot modify id';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Permission denied: cannot modify created_at';
    END IF;
  END IF;

  -- Campos de facturación: solo admin, service_role o funciones de facturación.
  IF NOT v_is_admin AND NOT v_trusted THEN
    IF NEW.plan_id               IS DISTINCT FROM OLD.plan_id
       OR NEW.firmas_creditos    IS DISTINCT FROM OLD.firmas_creditos
       OR NEW.firmas_usadas_mes  IS DISTINCT FROM OLD.firmas_usadas_mes
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.grace_until        IS DISTINCT FROM OLD.grace_until
       OR NEW.plan_renewed_at    IS DISTINCT FROM OLD.plan_renewed_at THEN
      RAISE EXCEPTION 'Permission denied: cannot modify billing fields';
    END IF;
  END IF;

  -- Último admin
  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── consumir_firma: marca contexto de facturación ────────────────────────
CREATE OR REPLACE FUNCTION public.consumir_firma(
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
  PERFORM set_config('app.billing_ctx', 'on', true);

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

  IF v_u.firmas_creditos > 0 THEN
    UPDATE public.users SET firmas_creditos = firmas_creditos - 1 WHERE id = p_user_id;
    INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
      VALUES (p_user_id, 'usage', -1, p_description, p_document_id, 'credito_pack');
    RETURN jsonb_build_object('ok', true, 'tipo', 'credito_pack',
                              'creditos_restantes', v_u.firmas_creditos - 1);
  END IF;

  IF v_u.firmas_usadas_mes < v_limite THEN
    UPDATE public.users SET firmas_usadas_mes = firmas_usadas_mes + 1 WHERE id = p_user_id;
    INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
      VALUES (p_user_id, 'usage', -1, p_description, p_document_id, 'cuota_plan');
    RETURN jsonb_build_object('ok', true, 'tipo', 'cuota_plan',
                              'usadas', v_u.firmas_usadas_mes + 1, 'limite', v_limite);
  END IF;

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

  RETURN jsonb_build_object('ok', false, 'motivo', 'limite_alcanzado',
                            'plan', v_plan_efectivo, 'limite', v_limite);
END;
$$;

-- ── revertir_firma: marca contexto ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revertir_firma(
  p_user_id     uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_description text DEFAULT 'Reembolso por fallo de envío'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_tx     public.credit_transactions%ROWTYPE;
  v_net    integer;
BEGIN
  PERFORM set_config('app.billing_ctx', 'on', true);

  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    p_user_id := v_caller;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'revertir_firma: user id required';
  END IF;

  SELECT COALESCE(-SUM(amount), 0) INTO v_net
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND type IN ('usage', 'refund')
    AND (p_document_id IS NULL OR document_id = p_document_id)
    AND created_at > now() - interval '15 minutes';

  IF v_net < 1 THEN
    RAISE EXCEPTION 'No recent consumption to refund';
  END IF;

  SELECT * INTO v_tx
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND type = 'usage'
    AND (p_document_id IS NULL OR document_id = p_document_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing to refund';
  END IF;

  IF v_tx.consumption_source = 'overage' THEN
    DELETE FROM public.overage_charges
      WHERE user_id = p_user_id AND firma_id = v_tx.document_id AND billed = false;
    UPDATE public.users SET firmas_usadas_mes = GREATEST(firmas_usadas_mes - 1, 0) WHERE id = p_user_id;
  ELSIF v_tx.consumption_source = 'cuota_plan' THEN
    UPDATE public.users SET firmas_usadas_mes = GREATEST(firmas_usadas_mes - 1, 0) WHERE id = p_user_id;
  ELSE
    UPDATE public.users SET firmas_creditos = firmas_creditos + 1 WHERE id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
  VALUES (p_user_id, 'refund', 1, p_description, v_tx.document_id, v_tx.consumption_source);
END;
$$;

-- ── add_firmas_creditos: marca contexto ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_firmas_creditos(
  p_user_id     uuid,
  p_credits     integer,
  p_session     text,
  p_description text DEFAULT 'Compra de pack de firmas'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marker text := 'stripe_session:' || COALESCE(p_session, '');
BEGIN
  PERFORM set_config('app.billing_ctx', 'on', true);

  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'add_firmas_creditos: invalid credit amount';
  END IF;

  IF p_session IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND type = 'purchase' AND description LIKE '%' || v_marker || '%'
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.users SET firmas_creditos = firmas_creditos + p_credits WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_firmas_creditos: user not found';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'purchase', p_credits, p_description || ' [' || v_marker || ']');

  RETURN true;
END;
$$;

-- ── reset_firmas_mensuales: marca contexto ───────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_firmas_mensuales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.billing_ctx', 'on', true);

  UPDATE public.users
  SET firmas_usadas_mes = 0,
      plan_renewed_at   = now()
  WHERE plan_id = 'gratis';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;
