-- ============================================================
-- Migration: Fix get_available_credits() to query correct table
-- Problem: get_available_credits() still queries credit_packs (product catalog)
--          instead of user_credit_purchases (purchase ledger).
--          This was missed in the 20260211_fix_credit_tables.sql migration.
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
  FROM public.user_credit_purchases
  WHERE user_id = v_user_id
    AND credits_used < credits_total;

  RETURN v_credits;
END;
$function$;
