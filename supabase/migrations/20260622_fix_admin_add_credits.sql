-- ============================================================
-- 2026-06-22 · Migrar admin_add_credits al nuevo sistema
--
-- Problema: admin_add_credits() insertaba en user_credit_purchases
-- (sistema FIFO antiguo, neutralizado en la migración 20260612).
-- Los créditos asignados desde admin quedaban en una tabla muerta
-- que consumir_firma() ya no lee → el usuario veía 0 créditos.
--
-- Fix:
--   1) Reescribe admin_add_credits para actualizar users.firmas_creditos
--      (misma tabla que consumir_firma() lee) con app.billing_ctx activo
--      para superar el guard de columnas de facturación.
--   2) Recupera los créditos de pack que quedaron varados en
--      user_credit_purchases para usuarios donde credits_used < credits_total
--      con pack_type IN ('admin_gift','support_gift','trial','free_trial')
--      asignados después de la migración del 2026-06-12.
-- ============================================================

BEGIN;

-- ── 1) Nueva admin_add_credits: escribe en users.firmas_creditos ──────
CREATE OR REPLACE FUNCTION public.admin_add_credits(
    p_target_user_id UUID,
    p_credits INTEGER,
    p_note TEXT DEFAULT 'admin_gift'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id     UUID;
    v_target_email TEXT;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: admin only';
    END IF;

    IF p_credits <= 0 OR p_credits > 10000 THEN
        RAISE EXCEPTION 'Invalid credit amount (must be 1-10000)';
    END IF;

    SELECT email INTO v_target_email FROM public.users WHERE id = p_target_user_id;
    IF v_target_email IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Habilita el contexto de facturación para superar guard_user_update.
    PERFORM set_config('app.billing_ctx', 'on', true);

    -- Suma los créditos directamente en users.firmas_creditos (nuevo sistema).
    UPDATE public.users
    SET firmas_creditos = firmas_creditos + p_credits
    WHERE id = p_target_user_id;

    -- Registra en el ledger de transacciones (visible en historial del usuario).
    INSERT INTO public.credit_transactions (user_id, type, amount, description)
    VALUES (p_target_user_id, 'gift', p_credits, 'Regalo de administrador [' || p_note || ']');

    -- Log de auditoría de admin.
    INSERT INTO public.event_logs (event_type, event_data, user_id)
    VALUES (
        'admin.credits.add',
        jsonb_build_object(
            'target_id', p_target_user_id,
            'target_email', v_target_email,
            'amount', p_credits,
            'note', p_note,
            'admin_id', v_admin_id
        ),
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'credits_added', p_credits,
        'target_email', v_target_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits TO service_role;

-- ── 2) Recuperar créditos varados post-migración ──────────────────────
-- Suma a firmas_creditos los packs de gift/trial que quedaron activos
-- (credits_used < credits_total) en user_credit_purchases después del
-- 2026-06-12 (fecha de neutralización). Los neutraliza a continuación
-- para que no se vuelvan a procesar.
DO $$
DECLARE
    v_rows integer;
BEGIN
    PERFORM set_config('app.billing_ctx', 'on', true);

    WITH varados AS (
        SELECT user_id,
               SUM(credits_total - credits_used) AS rescate
        FROM public.user_credit_purchases
        WHERE credits_used < credits_total
          AND created_at > '2026-06-12'::timestamptz
        GROUP BY user_id
    )
    UPDATE public.users u
    SET firmas_creditos = u.firmas_creditos + v.rescate
    FROM varados v
    WHERE u.id = v.user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE NOTICE 'Créditos recuperados para % usuarios', v_rows;

    -- Neutraliza los packs procesados para que no se procesen de nuevo.
    UPDATE public.user_credit_purchases
    SET credits_used = credits_total,
        updated_at   = now()
    WHERE credits_used < credits_total
      AND created_at > '2026-06-12'::timestamptz;
END $$;

COMMIT;
