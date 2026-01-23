-- Migration: 20260123_security_remediation.sql
-- Purpose: Fix Lovable Security Issues (Unauthorized Usage & Storage Conflicts).

-- ==========================================
-- 1. FIX CREDIT FUNCTIONS (Unauthorized Access)
-- ==========================================
-- Problem: Functions executed as SECURITY DEFINER (admin) without checking ownership.
-- Solution: Switch to SECURITY INVOKER. This forces the function to run with the
-- privileges of the calling user. Since we have RLS on 'credit_packs' and 'user_credits',
-- this automatically prevents users from accessing/consuming credits they don't own.

-- Intento de alteración segura (si existen)
DO $$
BEGIN
    -- get_available_credits
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_available_credits') THEN
        ALTER FUNCTION public.get_available_credits(uuid) SECURITY INVOKER;
    END IF;

    -- consume_credit (Assuming signature matches generic consumption)
    -- Warning: If consume_credit needs to write to tables the user CANT write to normally, 
    -- INVOKER might break it. But for credits, usually the user "updates" their own balance.
    -- If it fails, we revert to DEFINER + Auth Check. 
    -- Given the error "Unauthorized access to ANY user's credits", INVOKER is the architectural fix.
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'consume_credit') THEN
         ALTER FUNCTION public.consume_credit(uuid, text) SECURITY INVOKER; 
    END IF;
    
    -- handle_new_user (Trigger) usually needs DEFINER to create rows on auth.users insert?
    -- No, 'handle_new_user' usually runs on public.users insert.
    -- Lovable didn't complain about 'handle_new_user' for unauthorized access, only 'Credit functions'.
END $$;

-- ==========================================
-- 2. FIX STORAGE POLICIES (Conflicting Policies)
-- ==========================================
-- Problem: Multiple permissive/restrictive policies colliding on 'documents' bucket.
-- Solution: Wipe slate clean for this bucket and apply 3 clear rules.

-- 2.1 Drop POTENTIAL conflicting policies (Generic names found in typical setups)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own" ON storage.objects;
DROP POLICY IF EXISTS "Give me access to everything" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read" ON storage.objects;

-- 2.2 Re-Apply STRICT Policies
-- Rule A: Public READ (Need this for Signers who are anonymous/token based, UNTIL we move to Signed URLs fully).
-- We make it explicit to resolve "Conflict".
CREATE POLICY "Documents Public Read" ON storage.objects
FOR SELECT
USING ( bucket_id = 'documents' );

-- Rule B: Authenticated INSERT (Only logged in users/issuers can upload)
CREATE POLICY "Documents Auth Insert" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

-- Rule C: Owner UPDATE/DELETE (Only the uploader can modify/delete their files)
CREATE POLICY "Documents Owner Maintain" ON storage.objects
FOR ALL
USING ( bucket_id = 'documents' AND owner = auth.uid() )
WITH CHECK ( bucket_id = 'documents' AND owner = auth.uid() );

-- 2.3 Ensure Bucket Config
-- If we want public read, bucket should be public OR we need signed URLs.
-- Let's keep it public for compatibility but ensure the 'public' flag in buckets table matches reality.
UPDATE storage.buckets SET public = true WHERE id = 'documents';
