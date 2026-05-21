-- ============================================================
-- FIX: ROBUST USER CREATION TRIGGER
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Drop the old trigger/function to ensure we replace it cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Define the robust function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log debug info (Visible in Database > Postgres Logs)
  RAISE LOG 'handle_new_user triggered for Email: %, Meta: %', NEW.email, NEW.raw_user_meta_data;

  -- 1. Insert into public.users with FALLBACKS
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    -- Try obtaining name from multiple possible metadata fields
    COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1), -- Fallback to email prefix
        'Usuario'
    )
  );

  -- 2. Assign trial credits
  INSERT INTO public.credit_packs (user_id, pack_type, credits_total, price_paid)
  VALUES (NEW.id, 'trial', 2, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- CRITICAL FIX: If anything fails (e.g. duplicate key, permission), 
  -- catch the error, log it, but LET THE USER BE CREATED.
  RAISE WARNING 'Error in handle_new_user (swallowed to allow login): % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify Owner Permissions (just in case)
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.credit_packs TO service_role;
