-- ============================================================
-- 2026-06-23 · RLS admin para credit_transactions
--
-- Permite que el admin vea todas las transacciones de crédito
-- directamente (sin necesidad de función SECURITY DEFINER).
-- Los usuarios normales solo ven las suyas (política existente).
-- ============================================================

DROP POLICY IF EXISTS "Admin can view all transactions" ON public.credit_transactions;

CREATE POLICY "Admin can view all transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (public.is_admin());
