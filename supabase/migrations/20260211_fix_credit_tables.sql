-- ============================================================
-- Migration: Fix Credit System - Two-Table Architecture
-- Problem: credit_packs was repurposed from purchase ledger to product catalog,
--          breaking the entire credit system.
-- Solution: Create user_credit_purchases for the purchase ledger,
--           keep credit_packs as the product catalog.
-- ============================================================

-- 1. Create user_credit_purchases table (the purchase ledger)
CREATE TABLE IF NOT EXISTS public.user_credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pack_type TEXT NOT NULL,
    credits_total INTEGER NOT NULL,
    credits_used INTEGER NOT NULL DEFAULT 0,
    price_paid NUMERIC DEFAULT 0,
    stripe_payment_id TEXT UNIQUE,
    stripe_session_id TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.user_credit_purchases ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Users can only see their own purchases
CREATE POLICY "Users can view their own credit purchases"
    ON public.user_credit_purchases FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks, triggers)
CREATE POLICY "Service role full access on credit purchases"
    ON public.user_credit_purchases FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Users can insert their own (for handle_new_user trigger via SECURITY DEFINER)
CREATE POLICY "Allow insert for authenticated users"
    ON public.user_credit_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Trigger for updated_at
CREATE TRIGGER on_user_credit_purchases_updated
    BEFORE UPDATE ON public.user_credit_purchases
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Recreate user_credits VIEW to point at new table
CREATE OR REPLACE VIEW public.user_credits WITH (security_invoker = true) AS
SELECT 
  user_id,
  COALESCE(SUM(credits_total - credits_used), 0) AS available_credits,
  COUNT(*) AS total_packs
FROM public.user_credit_purchases
WHERE credits_total > credits_used
GROUP BY user_id;

-- 6. Recreate consume_credit function to use new table
DROP FUNCTION IF EXISTS public.consume_credit(integer);
DROP FUNCTION IF EXISTS public.consume_credit(integer, text);

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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current credits from the NEW purchases table
  SELECT COALESCE(SUM(credits_total - credits_used), 0) INTO v_current_credits
  FROM public.user_credit_purchases
  WHERE user_id = v_user_id;

  IF v_current_credits < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- FIFO: consume from the oldest pack first
  UPDATE public.user_credit_purchases
  SET credits_used = credits_used + amount,
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.user_credit_purchases 
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

-- 7. Recreate handle_new_user to insert into new table
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (length(new.raw_user_meta_data::text) > 5000) THEN
     RAISE EXCEPTION 'Metadata too large';
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    'user'
  );
  
  -- Welcome credits go into the purchases table
  INSERT INTO public.user_credit_purchases (user_id, pack_type, credits_total, credits_used, price_paid)
  VALUES (new.id, 'free_trial', 2, 0, 0);

  RETURN new;
END;
$function$;

-- 8. Grant permissions
GRANT SELECT ON public.user_credit_purchases TO authenticated;
GRANT SELECT ON public.user_credits TO authenticated, anon;
