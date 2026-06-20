-- ============================================================
-- 2026-06-19 · Periodo de suscripción y flag de cancelación programada
-- PRD §8.4
-- ============================================================

BEGIN;

-- Nuevas columnas en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Extender guard_user_update para proteger los nuevos campos de billing.
-- IMPORTANTE: reemplaza la función definida en 20260612130000_pricing_plans.sql
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
  v_trusted := COALESCE(auth.role(), '') = 'service_role'
            OR COALESCE(current_setting('app.billing_ctx', true), '') = 'on';

  IF NOT v_is_admin AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: cannot modify role';
  END IF;

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

  -- Campos de facturación: solo admin, service_role o funciones SECURITY DEFINER
  -- que activen la marca app.billing_ctx (consumir_firma, add_firmas_creditos, etc.).
  IF NOT v_is_admin AND NOT v_trusted THEN
    IF NEW.plan_id                              IS DISTINCT FROM OLD.plan_id
       OR NEW.firmas_creditos                   IS DISTINCT FROM OLD.firmas_creditos
       OR NEW.firmas_usadas_mes                 IS DISTINCT FROM OLD.firmas_usadas_mes
       OR NEW.stripe_customer_id                IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id            IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status               IS DISTINCT FROM OLD.subscription_status
       OR NEW.grace_until                       IS DISTINCT FROM OLD.grace_until
       OR NEW.plan_renewed_at                   IS DISTINCT FROM OLD.plan_renewed_at
       OR NEW.subscription_period_end           IS DISTINCT FROM OLD.subscription_period_end
       OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
    THEN
      RAISE EXCEPTION 'Permission denied: cannot modify billing fields';
    END IF;
  END IF;

  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Actualizar get_plan_status() para incluir los nuevos campos.
-- IMPORTANTE: reemplaza la versión de 20260612130000_pricing_plans.sql
CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_u       public.users%ROWTYPE;
  v_limite  integer;
  v_overage integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'no_auth');
  END IF;

  SELECT * INTO v_u FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'no_user');
  END IF;

  v_limite := public.firmas_limite_plan(v_u.plan_id);

  SELECT COUNT(*) INTO v_overage
  FROM public.overage_charges
  WHERE user_id = v_user_id
    AND mes_ciclo = date_trunc('month', now())::date;

  RETURN jsonb_build_object(
    'ok',                                true,
    'plan_id',                           v_u.plan_id,
    'subscription_status',               v_u.subscription_status,
    'firmas_usadas_mes',                 v_u.firmas_usadas_mes,
    'limite',                            v_limite,
    'firmas_creditos',                   v_u.firmas_creditos,
    'overage_firmas',                    v_overage,
    'overage_eur',                       round(v_overage * 0.40, 2),
    'plan_renewed_at',                   v_u.plan_renewed_at,
    'grace_until',                       v_u.grace_until,
    'subscription_period_end',           v_u.subscription_period_end,
    'subscription_cancel_at_period_end', v_u.subscription_cancel_at_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_status() TO authenticated;

COMMIT;
