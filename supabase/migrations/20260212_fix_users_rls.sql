-- 1. Ensure `role` column exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Drop existing policies to clear any recursive RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Select own user" ON public.users;
DROP POLICY IF EXISTS "Update own user" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- 3. Reset simple, non-recursive RLS policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- 4. Update the user role manually (Replace email!)
UPDATE public.users
SET role = 'admin'
WHERE email = 'jormattor@gmail.com'; -- Replace with your actual email if different

-- 5. Force update timestamp to verify write access
UPDATE public.users
SET updated_at = NOW()
WHERE email = 'jormattor@gmail.com';
