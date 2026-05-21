-- ============================================================
-- FIX: AMBIGUOUS CONSUME_CREDIT FUNCTION
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Drop ALL existing variations of the function to clear the ambiguity
--    We explicitly drop both potential signatures.
DROP FUNCTION IF EXISTS public.consume_credit(integer);
DROP FUNCTION IF EXISTS public.consume_credit(integer, text);

-- 2. Re-create the single, unified function with optional parameter
CREATE OR REPLACE FUNCTION public.consume_credit(amount integer, p_description text DEFAULT 'Envío de documento')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_current_credits integer;
  v_pack_id uuid;
BEGIN
  -- Get current user ID securely
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current credits (sum of all packs)
  SELECT COALESCE(SUM(credits_total - credits_used), 0) INTO v_current_credits
  FROM public.credit_packs
  WHERE user_id = v_user_id;

  IF v_current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Find the best pack (oldest created that has enough credits)
  SELECT id INTO v_pack_id
  FROM public.credit_packs 
  WHERE user_id = v_user_id 
    AND (credits_total - credits_used) >= amount
  ORDER BY created_at ASC
  LIMIT 1;

  -- Safety check for fragmentation (if user has credits but no single pack has enough)
  IF v_pack_id IS NULL THEN
     RAISE EXCEPTION 'Error interno: Créditos fragmentados. Contacte soporte.';
  END IF;

  -- Update the selected pack
  UPDATE public.credit_packs
  SET credits_used = credits_used + amount,
      updated_at = now()
  WHERE id = v_pack_id;

  -- Log the transaction
  INSERT INTO public.credit_transactions (user_id, type, amount, description, credit_pack_id)
  VALUES (v_user_id, 'usage', -amount, p_description, v_pack_id);
END;
$function$;
