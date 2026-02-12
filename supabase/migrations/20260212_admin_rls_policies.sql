-- ============================================================
-- Migration: Admin RLS Policies (FIXED - No Recursion)
-- Uses a SECURITY DEFINER function to avoid infinite RLS loop
-- ============================================================

-- Step 0: Create a helper function that bypasses RLS to check admin status
-- This avoids the infinite recursion when a policy on 'users' queries 'users'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- ============================================================
-- USERS TABLE
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users"
ON public.users FOR UPDATE
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- ============================================================
-- USER_CREDIT_PURCHASES TABLE
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all credit purchases" ON public.user_credit_purchases;
CREATE POLICY "Admins can view all credit purchases"
ON public.user_credit_purchases FOR SELECT
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can insert credit purchases for any user" ON public.user_credit_purchases;
CREATE POLICY "Admins can insert credit purchases for any user"
ON public.user_credit_purchases FOR INSERT
WITH CHECK ( public.is_admin() );

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING ( public.is_admin() );

-- ============================================================
-- EVENT_LOGS TABLE (for admin activity logs)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all event logs" ON public.event_logs;
CREATE POLICY "Admins can view all event logs"
ON public.event_logs FOR SELECT
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can insert event logs" ON public.event_logs;
CREATE POLICY "Admins can insert event logs"
ON public.event_logs FOR INSERT
WITH CHECK ( public.is_admin() );

-- ============================================================
-- Ensure admin role is set
-- ============================================================
UPDATE public.users SET role = 'admin' WHERE email = 'jormattor@gmail.com';
