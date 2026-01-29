-- Migration: Enhance consume_credit to log transactions automatically
-- This ensures all credit usage is recorded in credit_transactions

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
  SELECT COALESCE(SUM(credits_total - credits_used), 0) INTO v_current_credits
  FROM public.credit_packs
  WHERE user_id = v_user_id;

  IF v_current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Update credits (first available pack)
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

-- Also create a function to add credits (for purchases) that logs transactions
CREATE OR REPLACE FUNCTION public.add_credits_with_log(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_type text DEFAULT 'purchase'
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Log the transaction
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, p_type, p_amount, p_description);
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_credits_with_log(uuid, integer, text, text) TO service_role;
