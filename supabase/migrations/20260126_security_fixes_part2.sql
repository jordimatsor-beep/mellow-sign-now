-- 1. Fix get_available_credits to be secure (remove p_user_id)
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
  FROM public.credit_packs
  WHERE user_id = v_user_id
  AND (expires_at IS NULL OR expires_at > now());

  RETURN v_credits;
END;
$function$;

-- 2. Harden handle_new_user Input Validation
-- We replace the function to add checks on the metadata JSON
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
  -- (e.g. if we had a 'role' field in metadata, we should strip it here, but we use public.users.role)

  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    'user' -- Force default role
  );
  
  -- Create initial FREE credit pack (Example logic)
  INSERT INTO public.credit_packs (user_id, pack_type, credits_total, credits_used, price_paid)
  VALUES (new.id, 'free_trial', 1, 0, 0);

  RETURN new;
END;
$function$;

-- 3. Secure n8n_chat_histories (If exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories') THEN
        ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own chat history" ON public.n8n_chat_histories;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'n8n_chat_histories' AND column_name = 'user_id') THEN
             CREATE POLICY "Users can view own chat history" 
             ON public.n8n_chat_histories 
             FOR SELECT 
             USING (auth.uid() = user_id);
             
             DROP POLICY IF EXISTS "Users can insert own chat history" ON public.n8n_chat_histories;
              CREATE POLICY "Users can insert own chat history" 
             ON public.n8n_chat_histories 
             FOR INSERT 
             WITH CHECK (auth.uid() = user_id);
        ELSE
             -- If no user_id, maybe session_id? We default to false to be safe until schema is known.
             -- But usually chat_histories needs a user/session owner.
             -- For now, allow nothing if we don't know the owner column.
             RAISE NOTICE 'Table n8n_chat_histories exists but user_id column missing. RLS set to deny all by default.';
        END IF;
    END IF;
END
$$;
