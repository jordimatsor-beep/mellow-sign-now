-- ============================================================
-- 2026-06-23 · admin_get_gift_transactions
--
-- Devuelve las últimas asignaciones de créditos de regalo
-- para el panel de admin. Lee de credit_transactions (nuevo
-- sistema) en lugar de user_credit_purchases (antiguo/muerto).
-- SECURITY DEFINER para bypass de RLS (admin only).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_gift_transactions(p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    amount INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: admin only';
    END IF;
    RETURN QUERY
    SELECT
        ct.id,
        ct.user_id,
        u.email  AS user_email,
        u.name   AS user_name,
        ct.amount::INTEGER,
        ct.description,
        ct.created_at
    FROM public.credit_transactions ct
    JOIN public.users u ON u.id = ct.user_id
    WHERE ct.type = 'gift' AND ct.amount > 0
    ORDER BY ct.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_gift_transactions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_gift_transactions(INTEGER) TO service_role;
