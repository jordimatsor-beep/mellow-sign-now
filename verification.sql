-- ============================================
-- VERIFICATION SCRIPT: RLS & SECURITY
-- Run this in Supabase SQL Editor
-- ============================================

-- TEST 1: ANONYMOUS ACCESS TO SIGNATURES (Should FAIL)
-- Attempting to insert a fake signature directly as anon.
-- Expected: ERROR (new row violates row-level security policy) or empty result if silent.
SET ROLE anon;
DO $$
BEGIN
    RAISE NOTICE 'Testing Anon Insert on Signatures...';
    BEGIN
        INSERT INTO public.signatures (document_id, signer_email, hash_sha256)
        VALUES ('00000000-0000-0000-0000-000000000000', 'hacker@test.com', 'fakehash');
    EXCEPTION WHEN insufficient_privilege OR row_security_policy_violation THEN
        RAISE NOTICE 'SUCCESS: Anon insert blocked.';
    WHEN OTHERS THEN
        RAISE NOTICE 'POTENTIAL FAILURE: %', SQLERRM;
    END;
END $$;

-- TEST 2: ANONYMOUS ACCESS TO EVENT_LOGS (Should FAIL)
DO $$
BEGIN
    RAISE NOTICE 'Testing Anon Insert on Event Logs...';
    BEGIN
        INSERT INTO public.event_logs (document_id, event_type)
        VALUES ('00000000-0000-0000-0000-000000000000', 'hacked');
    EXCEPTION WHEN insufficient_privilege OR row_security_policy_violation THEN
        RAISE NOTICE 'SUCCESS: Anon insert blocked.';
    WHEN OTHERS THEN
        RAISE NOTICE 'POTENTIAL FAILURE: %', SQLERRM;
    END;
END $$;

-- TEST 3: SUBMIT_SIGNATURE RPC (Should EXIST)
-- We cannot easily mock the full RPC success without a valid token in this script,
-- but we can verify permissions are granted.
SET ROLE anon;
DO $$
BEGIN
    RAISE NOTICE 'Testing submit_signature RPC permissions...';
    -- Just calling it with junk should raise "Invalid token" (custom exception), not "Permission denied".
    BEGIN
        PERFORM public.submit_signature('fake_token', 'test@email.com', 'Test User', '127.0.0.1', 'Tester', 'url', 'hash');
    EXCEPTION 
        WHEN SQLSTATE 'P0001' THEN -- Raise Exception
            RAISE NOTICE 'SUCCESS: RPC executed (and correctly rejected invalid token).';
        WHEN insufficient_privilege THEN
             RAISE NOTICE 'FAILURE: Permission denied on RPC.';
        WHEN OTHERS THEN
             RAISE NOTICE 'Observation: %', SQLERRM;
    END;
END $$;

-- TEST 4: AUTHENTICATED ACCESS TO CREDIT_PACKS (Should see ONLY own)
-- Hard to simulate auth.uid() in pure SQL script without setup, 
-- but we can verify the policy exists.
SET ROLE postgres;
SELECT * FROM pg_policies WHERE tablename = 'credit_packs';

RAISE NOTICE 'Verification Complete.';
