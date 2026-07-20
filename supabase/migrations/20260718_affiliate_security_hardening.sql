-- ═══════════════════════════════════════════════════════════════════
-- Endurecimiento de seguridad del sistema de afiliados (2026-07-18)
-- Detectado en revisión posterior a la implementación de Stripe Connect.
-- ═══════════════════════════════════════════════════════════════════

-- ── FIX 1 (CRÍTICO) ──────────────────────────────────────────────────
-- guard_user_update protegía los campos de facturación pero NO las columnas
-- nuevas de Connect. Como los usuarios tienen policy de UPDATE sobre su propia
-- fila, cualquiera podía ejecutar:
--     update users set stripe_connect_status='active',
--                      stripe_connect_account_id='acct_arbitraria'
-- …saltándose la verificación (KYC) de Stripe y redirigiendo sus cobros.
-- Ahora solo admin o el service_role/contexto de billing pueden tocarlas.
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
      v_trusted  := COALESCE(auth.role(), '') = 'service_role'
                 OR COALESCE(current_setting('app.billing_ctx', true), '') = 'on';

      IF NOT v_is_admin AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Permission denied: cannot modify role';
      END IF;

      IF NOT v_is_admin THEN
        IF NEW.email      IS DISTINCT FROM OLD.email      THEN RAISE EXCEPTION 'Permission denied: cannot modify email'; END IF;
        IF NEW.id         IS DISTINCT FROM OLD.id         THEN RAISE EXCEPTION 'Permission denied: cannot modify id'; END IF;
        IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Permission denied: cannot modify created_at'; END IF;
      END IF;

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
           -- NUEVO: columnas de Stripe Connect (destino del dinero del afiliado)
           OR NEW.stripe_connect_account_id         IS DISTINCT FROM OLD.stripe_connect_account_id
           OR NEW.stripe_connect_status             IS DISTINCT FROM OLD.stripe_connect_status
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

-- ── FIX 2 (ALTA) ─────────────────────────────────────────────────────
-- La policy de INSERT permitía a un usuario crear su propia solicitud de pago
-- con CUALQUIER importe (no valida amount_eur), saltándose la edge function.
-- Un admin revisando la cola podría pagar una solicitud fabricada.
-- Con el pago mensual automático nadie necesita auto-insertarse: se elimina.
DROP POLICY IF EXISTS "User inserts own payouts" ON public.payout_requests;
