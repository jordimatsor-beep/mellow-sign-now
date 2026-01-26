-- 1. Fix consume_credit to be secure (remove p_user_id)
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
END;
$function$;

-- 2. Harden Users Table RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- 3. Harden Documents Table RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Secure View
DROP VIEW IF EXISTS public.documents_with_signatures;

CREATE VIEW public.documents_with_signatures 
WITH (security_invoker = true)
AS 
SELECT 
    d.id,
    d.title,
    d.created_at,
    d.status,
    s.signed_at,
    s.signer_email,
    s.signer_name
FROM public.documents d
LEFT JOIN public.signatures s ON d.id = s.document_id;
