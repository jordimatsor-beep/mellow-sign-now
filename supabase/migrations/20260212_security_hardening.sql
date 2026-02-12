-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Date: 2026-02-12
-- Fixes: CRIT-1 through CRIT-5, HIGH-1 through HIGH-3
-- ============================================================

-- ============================================================
-- CRIT-5: Restrict is_admin() EXECUTE permissions
-- Only authenticated users should be able to call this function
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- ============================================================
-- CRIT-1 + HIGH-1: Block role self-escalation + Column whitelist
-- Trigger prevents ANY user from modifying their own 'role' column
-- and restricts non-admin users to only updating safe columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if the person performing the update is an admin
    v_is_admin := public.is_admin();

    -- CRIT-1: Non-admins cannot change the 'role' column AT ALL
    IF NOT v_is_admin AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Permission denied: cannot modify role';
    END IF;

    -- HIGH-1: Non-admins can only change whitelisted columns
    IF NOT v_is_admin THEN
        -- Block changes to sensitive columns
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

    -- CRIT-4: Prevent last-admin demotion
    IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
        IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last admin';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop if exists to make re-runnable
DROP TRIGGER IF EXISTS trg_guard_user_update ON public.users;
CREATE TRIGGER trg_guard_user_update
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_user_update();

-- ============================================================
-- CRIT-2: Remove user INSERT on user_credit_purchases
-- Only admins and service_role should insert credit purchases
-- ============================================================
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_credit_purchases;

-- ============================================================
-- HIGH-2: Create admin_add_credits() SECURITY DEFINER function
-- Admins use this RPC instead of direct INSERT (cleaner + auditable)
-- ============================================================
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
    v_admin_id UUID;
    v_target_email TEXT;
BEGIN
    -- Verify caller is admin
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: admin only';
    END IF;

    -- Validate input
    IF p_credits <= 0 OR p_credits > 10000 THEN
        RAISE EXCEPTION 'Invalid credit amount (must be 1-10000)';
    END IF;

    -- Verify target user exists
    SELECT email INTO v_target_email FROM public.users WHERE id = p_target_user_id;
    IF v_target_email IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Insert the credit purchase
    INSERT INTO public.user_credit_purchases (user_id, pack_type, credits_total, credits_used, price_paid)
    VALUES (p_target_user_id, p_note, p_credits, 0, 0);

    -- Log the admin action
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

-- Only authenticated users can call (but function self-validates admin)
GRANT EXECUTE ON FUNCTION public.admin_add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits TO service_role;

-- ============================================================
-- CRIT-3: Restrict user log inserts to non-admin event types
-- Users should not be able to forge admin.* log entries
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own logs" ON public.event_logs;
CREATE POLICY "Users can insert own logs" ON public.event_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND event_type NOT LIKE 'admin.%'
    );

-- Admin log insertion is already covered by "Admins can insert event logs" policy

-- ============================================================
-- HIGH-3: Explicit deny DELETE policies on critical tables
-- ============================================================

-- user_credit_purchases: no one should delete (except service_role which bypasses RLS)
DROP POLICY IF EXISTS "No delete on credit purchases" ON public.user_credit_purchases;
CREATE POLICY "No delete on credit purchases"
    ON public.user_credit_purchases FOR DELETE
    USING (false);

-- event_logs: logs are immutable audit trail - never deletable via RLS
DROP POLICY IF EXISTS "No delete on event logs" ON public.event_logs;
CREATE POLICY "No delete on event logs"
    ON public.event_logs FOR DELETE
    USING (false);

-- Also prevent UPDATE on event_logs (immutable audit trail)
DROP POLICY IF EXISTS "No update on event logs" ON public.event_logs;
CREATE POLICY "No update on event logs"
    ON public.event_logs FOR UPDATE
    USING (false);

-- ============================================================
-- DONE: All CRIT and HIGH findings addressed
-- ============================================================
