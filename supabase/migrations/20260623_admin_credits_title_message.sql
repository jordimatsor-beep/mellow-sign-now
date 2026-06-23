-- ============================================================
-- 2026-06-23 · admin_add_credits acepta título y mensaje
--
-- Permite al admin personalizar el texto que ve el usuario en
-- la pestaña "Compras" de /credits cuando recibe créditos de regalo.
-- La descripción se serializa como JSON {title, message, note} para
-- que el frontend pueda renderizarla de forma rica.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_add_credits(
    p_target_user_id UUID,
    p_credits        INTEGER,
    p_note           TEXT DEFAULT 'admin_gift',
    p_title          TEXT DEFAULT NULL,
    p_message        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id     UUID;
    v_target_email TEXT;
    v_description  TEXT;
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

    PERFORM set_config('app.billing_ctx', 'on', true);

    UPDATE public.users
    SET firmas_creditos = firmas_creditos + p_credits
    WHERE id = p_target_user_id;

    -- Serializa título y mensaje como JSON para renderizado rico en el front.
    v_description := jsonb_build_object(
        'title',   COALESCE(NULLIF(trim(p_title),   ''), 'Créditos de regalo'),
        'message', COALESCE(NULLIF(trim(p_message), ''), ''),
        'note',    p_note
    )::text;

    INSERT INTO public.credit_transactions (user_id, type, amount, description)
    VALUES (p_target_user_id, 'gift', p_credits, v_description);

    INSERT INTO public.event_logs (event_type, event_data, user_id)
    VALUES (
        'admin.credits.add',
        jsonb_build_object(
            'target_id',    p_target_user_id,
            'target_email', v_target_email,
            'amount',       p_credits,
            'note',         p_note,
            'title',        p_title,
            'admin_id',     v_admin_id
        ),
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success',       true,
        'credits_added', p_credits,
        'target_email',  v_target_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits TO service_role;

COMMIT;
