-- ============================================================
-- Migration: Add Admin RLS policies
-- Allows users with role='admin' to read all users and credit data
-- ============================================================

-- 1. Allow admin to read ALL users (not just their own)
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- 2. Allow admin to read ALL credit purchases
CREATE POLICY "Admins can view all credit purchases"
ON public.user_credit_purchases FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- 3. Allow admin to INSERT credit purchases for any user (manual credit assignment)
CREATE POLICY "Admins can insert credit purchases for any user"
ON public.user_credit_purchases FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- 4. Make sure jordmattor has admin role
UPDATE public.users SET role = 'admin' WHERE email = 'jormattor@gmail.com';
