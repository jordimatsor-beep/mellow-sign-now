-- Fix consume_credit function to log transactions
CREATE OR REPLACE FUNCTION public.consume_credit(amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

  -- Get current credits
  SELECT (credits_total - credits_used) INTO v_current_credits
  FROM public.credit_packs
  WHERE user_id = v_user_id;

  IF v_current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Update credits
  UPDATE public.credit_packs
  SET credits_used = credits_used + amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (v_user_id, 'usage', -amount, 'Consumo de crédito por envío de documento');

END;
$function$;
