-- Fix: SECURITY DEFINER functions without SET search_path are vulnerable to
-- schema injection attacks. Attacker-controlled schemas with higher priority
-- could shadow built-in functions and execute code with elevated privileges.

-- Fix handle_new_user (called on every new user registration)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1),
        'Usuario'
    )
  );

  INSERT INTO public.credit_packs (user_id, pack_type, credits_total, price_paid)
  VALUES (NEW.id, 'trial', 2, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'CRITICAL ERROR in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix is_admin() if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
      SET search_path = public
      AS 'SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ''admin'')';
    $f$;
  END IF;
END $$;

-- Fix is_support()
CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('support', 'admin')
    );
$$;
