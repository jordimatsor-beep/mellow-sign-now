-- Migration: Update welcome credits to 2
-- Replaces handle_new_user function to ensure new users get 2 credits instead of 1

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate Metadata: Block potentially dangerous fields or excessively large inputs
  IF (length(new.raw_user_meta_data::text) > 5000) THEN
     RAISE EXCEPTION 'Metadata too large';
  END IF;

  -- Ensure we don't accidentally privilege a user via metadata injection
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    'user' -- Force default role
  );
  
  -- Create initial FREE credit pack with 2 credits
  INSERT INTO public.credit_packs (user_id, pack_type, credits_total, credits_used, price_paid)
  VALUES (new.id, 'free_trial', 2, 0, 0);

  RETURN new;
END;
$function$;
