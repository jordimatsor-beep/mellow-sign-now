-- ============================================================
-- Migration: Fix get_available_credits() to use user_credit_purchases
-- Problem: The function was missed during the 20260211 migration
--          and still queries the old credit_packs (product catalog) table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_credits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_credits integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(credits_total - credits_used), 0)
  INTO v_credits
  FROM public.user_credit_purchases   -- ✅ Fixed: was credit_packs
  WHERE user_id = v_user_id
  AND (expires_at IS NULL OR expires_at > now());

  RETURN v_credits;
END;
$function$;
