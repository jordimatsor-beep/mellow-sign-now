-- ============================================================
-- 2026-06-12 · Política de precios — modelo de planes + overage
--
-- Migra FirmaClara del modelo "créditos de pago único" (FIFO sobre
-- user_credit_purchases) al modelo mixto del PRD:
--   • Tier Gratis permanente   → 2 firmas/mes (cuota que se resetea)
--   • Básico   9 €/mes          → 10 firmas/mes
--   • Profesional 19 €/mes      → 50 firmas/mes + overage 0,40 €/firma
--   • Pack puntual 15 € / 15 firmas → saldo no caducable (firmas_creditos)
--
-- DECISIÓN DE ARQUITECTURA (clave para no romper producción):
--   consumir_firma() pasa a ser el ÚNICO núcleo de consumo. Las funciones
--   existentes consume_credit / consume_credit_for_user / refund_credit se
--   redefinen como envoltorios que delegan en él, de modo que TODOS los
--   puntos de llamada actuales (send-invite-v2, API signature-requests,
--   reembolso por fallo de envío) siguen funcionando sin doble cargo ni
--   fuente de verdad duplicada. El saldo pasa a vivir en users.firmas_*.
--   user_credit_purchases queda como histórico inerte (no se vuelve a
--   leer/escribir para saldo; se conserva para auditoría).
--
-- DESVIACIÓN JUSTIFICADA respecto al PRD §4.5:
--   El reset por cron solo afecta a plan 'gratis'. Los planes de pago se
--   resetean en invoice.payment_succeeded (su ciclo real de Stripe). Resetear
--   un plan de pago el día 1 cuando su ciclo vence el día 15 le regalaría
--   cuota a mitad de ciclo. Así el contador se ata al ciclo de facturación.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════
-- 1) Columnas de plan / suscripción en users  (PRD §4.1)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'gratis'
    CHECK (plan_id IN ('gratis', 'basico', 'profesional'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_renewed_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firmas_usadas_mes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firmas_creditos INTEGER NOT NULL DEFAULT 0;

-- past_due con periodo de gracia: a partir de cuándo se baja a gratis.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ;

-- Unicidad de los IDs de Stripe (parcial: ignora NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON public.users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
  ON public.users (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- 2) credit_transactions: distinguir el origen del consumo (para refund exacto)
-- ════════════════════════════════════════════════════════════════════
-- Valores: 'credito_pack' | 'cuota_plan' | 'overage' (NULL = legado FIFO).
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS consumption_source TEXT;

-- ════════════════════════════════════════════════════════════════════
-- 3) Tabla overage_charges  (PRD §4.2)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.overage_charges (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES public.users(id) ON DELETE CASCADE,
  firma_id               UUID REFERENCES public.documents(id) ON DELETE SET NULL, -- documento que generó el cargo
  charged_at             TIMESTAMPTZ DEFAULT now(),
  amount_eur             NUMERIC(10,4) DEFAULT 0.40,  -- precio unitario en el momento del cargo
  stripe_invoice_item_id TEXT,                        -- ID del item en Stripe (cuando se factura)
  billed                 BOOLEAN NOT NULL DEFAULT false, -- ya volcado a una factura de Stripe
  mes_ciclo              DATE,                        -- primer día del ciclo (para agrupar)
  CONSTRAINT unique_firma_overage UNIQUE (firma_id)
);

CREATE INDEX IF NOT EXISTS idx_overage_charges_user    ON public.overage_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_overage_charges_pending ON public.overage_charges(user_id, billed) WHERE billed = false;

ALTER TABLE public.overage_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User sees own overage" ON public.overage_charges;
CREATE POLICY "User sees own overage" ON public.overage_charges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access overage" ON public.overage_charges;
CREATE POLICY "Service role full access overage" ON public.overage_charges
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════
-- 4) Tabla plan_history  (PRD §4.3) — log inmutable de cambios de plan
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.plan_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_anterior   TEXT,
  plan_nuevo      TEXT,
  motivo          TEXT,  -- 'upgrade' | 'downgrade' | 'cancelacion' | 'pago_fallido' | 'admin' | 'migracion'
  changed_at      TIMESTAMPTZ DEFAULT now(),
  stripe_event_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_plan_history_user ON public.plan_history(user_id);

ALTER TABLE public.plan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User sees own plan history" ON public.plan_history;
CREATE POLICY "User sees own plan history" ON public.plan_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access plan history" ON public.plan_history;
CREATE POLICY "Service role full access plan history" ON public.plan_history
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════
-- 5) Límite de firmas/mes por plan (helper inmutable)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.firmas_limite_plan(p_plan text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'gratis'      THEN 2
    WHEN 'basico'      THEN 10
    WHEN 'profesional' THEN 50
    ELSE 0
  END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 6) NÚCLEO: consumir_firma()  (PRD §4.4, robustecida)
--    Orden de consumo: 1) crédito de pack  2) cuota del plan  3) overage
--    (solo Profesional)  4) bloqueo.
-- ════════════════════════════════════════════════════════════════════
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
  -- Marca de confianza para el guard de columnas de facturación (ver §15).
  PERFORM set_config('app.billing_ctx', 'on', true);

  -- Resolución segura del titular: un usuario autenticado solo puede consumir
  -- para sí mismo; el service_role (auth.uid() NULL) usa el p_user_id explícito.
  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    p_user_id := v_caller;
  ELSIF p_user_id IS NULL THEN
    RAISE EXCEPTION 'consumir_firma: user id required';
  END IF;

  -- Lock de la fila del usuario: serializa consumos concurrentes del mismo titular.
  SELECT * INTO v_u FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'consumir_firma: user not found';
  END IF;

  -- Plan efectivo: si la suscripción está en mora y venció el periodo de gracia
  -- (PRD §7), el usuario consume como Gratis hasta que regularice el pago. No se
  -- muta plan_id, así que al pagar (invoice.payment_succeeded) recupera su plan
  -- automáticamente sin intervención.
  v_plan_efectivo := v_u.plan_id;
  IF v_u.subscription_status = 'past_due'
     AND v_u.grace_until IS NOT NULL
     AND v_u.grace_until < now() THEN
    v_plan_efectivo := 'gratis';
  END IF;

  v_limite := public.firmas_limite_plan(v_plan_efectivo);

  -- 1) Crédito de pack puntual (se consume ANTES que la cuota, en cualquier plan).
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

  -- 3) Overage: SOLO Profesional (con suscripción al corriente). Permite enviar
  --    y registra el cargo extra.
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

  -- 4) Bloqueo (Gratis / Básico al alcanzar el límite y sin crédito de pack).
  RETURN jsonb_build_object('ok', false, 'motivo', 'limite_alcanzado',
                            'plan', v_plan_efectivo, 'limite', v_limite);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consumir_firma(uuid, uuid, text) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 7) revertir_firma()  — deshace el último consumo (reembolso por fallo de envío)
-- ════════════════════════════════════════════════════════════════════
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

  -- Anti-abuso: solo si hay consumo neto reciente (últimos 15 min) en el ámbito.
  SELECT COALESCE(-SUM(amount), 0) INTO v_net
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND type IN ('usage', 'refund')
    AND (p_document_id IS NULL OR document_id = p_document_id)
    AND created_at > now() - interval '15 minutes';

  IF v_net < 1 THEN
    RAISE EXCEPTION 'No recent consumption to refund';
  END IF;

  -- Localiza el cargo de consumo más reciente a deshacer.
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

  -- Revierte según el origen del consumo.
  IF v_tx.consumption_source = 'overage' THEN
    DELETE FROM public.overage_charges
      WHERE user_id = p_user_id AND firma_id = v_tx.document_id AND billed = false;
    UPDATE public.users SET firmas_usadas_mes = GREATEST(firmas_usadas_mes - 1, 0) WHERE id = p_user_id;
  ELSIF v_tx.consumption_source = 'cuota_plan' THEN
    UPDATE public.users SET firmas_usadas_mes = GREATEST(firmas_usadas_mes - 1, 0) WHERE id = p_user_id;
  ELSE
    -- 'credito_pack' o legado (NULL): devolver al saldo de pack.
    UPDATE public.users SET firmas_creditos = firmas_creditos + 1 WHERE id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description, document_id, consumption_source)
  VALUES (p_user_id, 'refund', 1, p_description, v_tx.document_id, v_tx.consumption_source);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 8) Envoltorios de compatibilidad: redirigen el código existente al núcleo
--    nuevo SIN tener que redeployar las edge functions de inmediato.
-- ════════════════════════════════════════════════════════════════════

-- consume_credit(amount, descripcion, documento) — usado por send-invite-v2 / front.
-- Mantiene el contrato: lanza 'Insufficient credits' cuando se bloquea.
CREATE OR REPLACE FUNCTION public.consume_credit(
  amount        integer,
  p_description text DEFAULT 'Envío de documento',
  p_document_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res jsonb;
  i     integer;
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be a positive integer';
  END IF;

  FOR i IN 1..amount LOOP
    v_res := public.consumir_firma(auth.uid(), p_document_id, p_description);
    IF (v_res->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Insufficient credits';
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit(integer, text, uuid) TO service_role;

-- consume_credit_for_user(user, descripcion) — usado por la API (signature-requests).
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
  v_res jsonb;
BEGIN
  v_res := public.consumir_firma(p_user_id, NULL, p_description);
  IF (v_res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_credit_for_user(uuid, text) TO service_role;

-- refund_credit(descripcion) — usado por send-invite-v2 al fallar el envío.
CREATE OR REPLACE FUNCTION public.refund_credit(
  p_description text DEFAULT 'Reembolso por fallo de envío'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.revertir_firma(auth.uid(), NULL, p_description);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_credit(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.refund_credit(text) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 9) get_available_credits()  — repuntada al nuevo modelo
--    Saldo "disponible para enviar ya" = créditos de pack + cuota restante.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_available_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_u       public.users%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_u FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN v_u.firmas_creditos
       + GREATEST(public.firmas_limite_plan(v_u.plan_id) - v_u.firmas_usadas_mes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_credits() TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 10) get_plan_status()  — estado completo para el dashboard / página de precios
-- ════════════════════════════════════════════════════════════════════
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

  -- nº de firmas de overage del ciclo actual (Profesional)
  SELECT COUNT(*) INTO v_overage
  FROM public.overage_charges
  WHERE user_id = v_user_id
    AND mes_ciclo = date_trunc('month', now())::date;

  RETURN jsonb_build_object(
    'ok', true,
    'plan_id', v_u.plan_id,
    'subscription_status', v_u.subscription_status,
    'firmas_usadas_mes', v_u.firmas_usadas_mes,
    'limite', v_limite,
    'firmas_creditos', v_u.firmas_creditos,
    'overage_firmas', v_overage,
    'overage_eur', round(v_overage * 0.40, 2),
    'plan_renewed_at', v_u.plan_renewed_at,
    'grace_until', v_u.grace_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_status() TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 11) reset_firmas_mensuales()  (PRD §4.5 — solo plan gratis; ver cabecera)
-- ════════════════════════════════════════════════════════════════════
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

REVOKE EXECUTE ON FUNCTION public.reset_firmas_mensuales() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_firmas_mensuales() TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 12) Migración de datos (PRD §8) — nadie pierde créditos
--     Vuelca el saldo FIFO restante a users.firmas_creditos y deja el plan
--     en 'gratis'. Idempotente: solo migra usuarios aún sin plan asignado
--     (firmas_creditos = 0 y sin suscripción) para no duplicar al re-ejecutar.
-- ════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  UPDATE public.users u
  SET firmas_creditos = COALESCE(saldo.restante, 0),
      plan_id         = 'gratis',
      firmas_usadas_mes = 0,
      plan_renewed_at = now()
  FROM (
    SELECT user_id, SUM(GREATEST(credits_total - credits_used, 0)) AS restante
    FROM public.user_credit_purchases
    WHERE (expires_at IS NULL OR expires_at > now())
    GROUP BY user_id
  ) AS saldo
  WHERE u.id = saldo.user_id
    AND u.stripe_subscription_id IS NULL
    AND u.firmas_creditos = 0;

  -- Neutraliza el ledger FIFO antiguo para que ninguna ruta olvidada lo
  -- vuelva a gastar (el saldo ya vive en users.firmas_creditos).
  UPDATE public.user_credit_purchases
  SET credits_used = credits_total,
      updated_at   = now()
  WHERE credits_used < credits_total;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- 13) handle_new_user: nuevos usuarios nacen en plan Gratis (2 firmas/mes)
--     en vez de recibir 2 créditos de pack de un solo uso.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (length(new.raw_user_meta_data::text) > 5000) THEN
     RAISE EXCEPTION 'Metadata too large';
  END IF;

  -- plan_id / firmas_* toman sus DEFAULT (gratis, 0, 0).
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 14) add_firmas_creditos()  — suma créditos de pack de forma atómica e
--     idempotente (la usa el webhook de Stripe al completar la compra del
--     pack puntual). El marcador de sesión evita doble abono ante reintentos.
-- ════════════════════════════════════════════════════════════════════
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

  -- Idempotencia: si ya existe una compra con este marcador de sesión, no repetir.
  IF p_session IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND type = 'purchase' AND description LIKE '%' || v_marker || '%'
  ) THEN
    RETURN false; -- ya abonado
  END IF;

  UPDATE public.users
  SET firmas_creditos = firmas_creditos + p_credits
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_firmas_creditos: user not found';
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'purchase', p_credits, p_description || ' [' || v_marker || ']');

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_firmas_creditos(uuid, integer, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.add_firmas_creditos(uuid, integer, text, text) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 15) Guard de columnas de facturación (SEGURIDAD)
--     La RLS de users solo comprueba auth.uid()=id, y el guard previo (lista
--     negra) no cubría las columnas nuevas → un usuario podría auto-asignarse
--     plan/creditos con un UPDATE directo. Extiende guard_user_update para
--     bloquear esos campos salvo admin / service_role / flag app.billing_ctx
--     (que marcan las funciones de facturación SECURITY DEFINER de arriba).
-- ════════════════════════════════════════════════════════════════════
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

  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
