-- Migration: Fix consume_credit ambiguity and ensure correct logic
-- Drop the ambiguous functions first to ensure a clean slate
DROP FUNCTION IF EXISTS public.consume_credit(integer);
DROP FUNCTION IF EXISTS public.consume_credit(integer, text);

-- Re-create the function with the correct logic (aggregation capable) and transaction logging
CREATE OR REPLACE FUNCTION public.consume_credit(amount integer, p_description text DEFAULT 'Envío de documento')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_current_credits integer;
BEGIN
  -- Get current user ID securely
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current credits (sum of all packs)
  -- This fixes the bug where "SELECT ... INTO" might fail or return partial data if multiple packs exist
  SELECT COALESCE(SUM(credits_total - credits_used), 0) INTO v_current_credits
  FROM public.credit_packs
  WHERE user_id = v_user_id;

  IF v_current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Update credits (first available pack)
  -- Uses FIFO strategy: consume from the oldest pack first
  UPDATE public.credit_packs
  SET credits_used = credits_used + amount,
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.credit_packs 
    WHERE user_id = v_user_id 
      AND (credits_total - credits_used) >= amount
    ORDER BY created_at ASC
    LIMIT 1
  );

  -- Log the transaction
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'usage', -amount, p_description);
END;
$function$;
