-- ============================================
-- MIGRATION: Update submit_signature RPC for TSA [HARDENED]
-- DATE: 2026-01-21
-- ============================================

-- 1. SAFE COLUMN ADDITION (P0)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'signatures' AND column_name = 'tsa_request') THEN
        ALTER TABLE public.signatures ADD COLUMN tsa_request TEXT; -- Storing as Base64 Text for simplicity in this phase
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'signatures' AND column_name = 'tsa_response') THEN
        ALTER TABLE public.signatures ADD COLUMN tsa_response TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'signatures' AND column_name = 'tsa_timestamp') THEN
        ALTER TABLE public.signatures ADD COLUMN tsa_timestamp TIMESTAMPTZ;
    END IF;
END $$;

-- 2. UPDATE RPC (Hardened)
-- Drop old signature to ensure clean replace
DROP FUNCTION IF EXISTS public.submit_signature(TEXT, TEXT, TEXT, INET, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_signature(
    p_sign_token TEXT,
    p_signer_email TEXT,
    p_signer_name TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_signature_image_url TEXT,
    p_hash_sha256 TEXT,
    -- New TSA Params
    p_tsa_request TEXT DEFAULT NULL,
    p_tsa_response TEXT DEFAULT NULL,
    p_tsa_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp -- P0 Hardening
AS $$
DECLARE
    v_doc_id UUID;
    v_current_status VARCHAR;
    v_existing_sig_id UUID;
BEGIN
    -- 1. Validate Document Status
    SELECT id, status INTO v_doc_id, v_current_status
    FROM public.documents
    WHERE sign_token = p_sign_token;

    IF v_doc_id IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    -- Replay Protection
    IF v_current_status = 'signed' THEN
        RAISE EXCEPTION 'Document is already signed';
    END IF;
    
    IF v_current_status NOT IN ('sent', 'viewed') THEN
        RAISE EXCEPTION 'Document is not signable (Status: %)', v_current_status;
    END IF;

    -- DB Concurrency Check
    SELECT id INTO v_existing_sig_id FROM public.signatures WHERE document_id = v_doc_id LIMIT 1;
    IF v_existing_sig_id IS NOT NULL THEN
        RAISE EXCEPTION 'Duplicate signature prevented';
    END IF;

    -- 2. Insert Signature
    INSERT INTO public.signatures (
        document_id,
        signer_name,
        signer_email,
        ip_address,
        user_agent,
        signature_image_url,
        hash_sha256,
        signed_at,
        tsa_request,
        tsa_response,
        tsa_timestamp
    ) VALUES (
        v_doc_id,
        p_signer_name,
        p_signer_email,
        p_ip_address,
        p_user_agent,
        p_signature_image_url,
        p_hash_sha256,
        NOW(),
        -- Note: Schema might define these as TEXT or BYTEA.
        -- If BYTEA, we need decode(..., 'base64'). 
        -- In previous step we added them as TEXT. So direct insert is fine.
        -- If they were BYTEA: decode(p_tsa_request, 'base64')
        p_tsa_request, 
        p_tsa_response,
        p_tsa_timestamp
    );

    -- 3. Update Status
    UPDATE public.documents
    SET status = 'signed',
        signed_at = NOW()
    WHERE id = v_doc_id;

    -- 4. Log Event
    INSERT INTO public.event_logs (
        document_id,
        event_type,
        event_data,
        ip_address,
        user_agent
    ) VALUES (
        v_doc_id,
        'document.signed',
        jsonb_build_object(
            'signer_email', p_signer_email, 
            'token', p_sign_token,
            'tsa_timestamp', p_tsa_timestamp
        ),
        p_ip_address,
        p_user_agent
    );

    RETURN jsonb_build_object('success', true, 'document_id', v_doc_id);
END;
$$;
