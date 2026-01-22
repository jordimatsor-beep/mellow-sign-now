-- ============================================
-- MIGRATION: Fix Signatures RLS & Permissions [HARDENED]
-- DATE: 2026-01-21
-- ============================================

-- Verified that extension exists, but good practice
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HARDENED DOCUMENT GETTER
-- Validates token AND status. Logs view event internally.

CREATE OR REPLACE FUNCTION public.get_document_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    file_url TEXT,
    status VARCHAR,
    signer_email VARCHAR,
    signer_name VARCHAR,
    created_at TIMESTAMPTZ,
    issuer_data JSONB -- If stored in users table or metadata, might need join. For now returning basic doc data.
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp -- P0 Hardening
AS $$
DECLARE
    v_doc_record RECORD;
BEGIN
    SELECT 
        d.id, d.title, d.file_url, d.status, d.signer_email, d.signer_name, d.created_at, d.user_id
    INTO v_doc_record
    FROM public.documents d
    WHERE d.sign_token = p_token;

    -- Return empty if not found
    IF v_doc_record.id IS NULL THEN
        RETURN;
    END IF;

    -- P1 Status Check: Only allow if Sent, Viewed, or Signed (to see completed)
    -- Block 'draft', 'expired', 'cancelled' if appropriate.
    -- Assuming 'viewed' is a transition state from 'sent'.
    IF v_doc_record.status NOT IN ('sent', 'viewed', 'signed') THEN
        RETURN;
    END IF;

    -- Update status to 'viewed' if it was 'sent'
    -- And LOG the view event internally
    IF v_doc_record.status = 'sent' THEN
        UPDATE public.documents SET status = 'viewed', viewed_at = NOW() WHERE documents.id = v_doc_record.id;
        
        -- Internal Log (Safe, no RLS needed for user)
        INSERT INTO public.event_logs (document_id, event_type, event_data)
        VALUES (v_doc_record.id, 'document.viewed', jsonb_build_object('token', p_token));
    ELSE
        -- Just log the access
        INSERT INTO public.event_logs (document_id, event_type, event_data)
        VALUES (v_doc_record.id, 'document.accessed', jsonb_build_object('token', p_token));
    END IF;

    -- Return Data
    id := v_doc_record.id;
    title := v_doc_record.title;
    file_url := v_doc_record.file_url;
    status := v_doc_record.status;
    signer_email := v_doc_record.signer_email;
    signer_name := v_doc_record.signer_name;
    created_at := v_doc_record.created_at;
    -- issuer_data could be fetched here if needed
    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_document_by_token TO anon, authenticated, service_role;


-- 2. HARDENED SIGNATURE SUBMISSION
-- Includes Replay Protection, Status Check, Internal Logging, and TSA Support.

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
    -- 1. Validate Document Token & Status
    SELECT id, status INTO v_doc_id, v_current_status
    FROM public.documents
    WHERE sign_token = p_sign_token;

    IF v_doc_id IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    -- P1 Replay Protection: Check if already signed
    -- (Even if status says 'signed', check signatures table to be sure)
    IF v_current_status = 'signed' THEN
        RAISE EXCEPTION 'Document is already signed';
    END IF;

    IF v_current_status NOT IN ('sent', 'viewed') THEN
        RAISE EXCEPTION 'Document is not signable (Status: %)', v_current_status;
    END IF;

    -- Double check signatures table for concurrency
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
        p_tsa_request,
        p_tsa_response,
        p_tsa_timestamp
    );

    -- 3. Update Document Status
    UPDATE public.documents
    SET status = 'signed',
        signed_at = NOW()
    WHERE id = v_doc_id;

    -- 4. Log Event (Internal)
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

GRANT EXECUTE ON FUNCTION public.submit_signature TO anon, authenticated, service_role;

-- 3. REMOVED UNSAFE EVENT_LOGS POLICY
-- We no longer need to allow anon insert on event_logs because the RPCs handle it internally (`SECURITY DEFINER`).
-- We only keep the authenticated insert if strictly necessary (e.g. user actions in dashboard).
-- If we want to strictly follow P1 "User can only insert own logs":
DROP POLICY IF EXISTS "Users can insert own logs" ON public.event_logs;

CREATE POLICY "Users can insert own logs" ON public.event_logs
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- 4. REPLAY PROTECTION (Constraint)
-- Only one signature per document?
-- If multi-signature support is needed later, this might block it.
-- But requested P1: "Enforce one signature per token ... add UNIQUE constraint"
-- Since we identify doc by sign_token currently, and it seems 1:1, let's add unique on document_id for signature?
-- Or better, unique on (document_id, signer_email) if allowing multiple?
-- PRD implies 1 signer per "Envío". 
-- Let's add partial index unique on document_id.
-- Check if index exists first? DO block to be safe.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signatures_document_id_key') THEN
        ALTER TABLE public.signatures ADD CONSTRAINT signatures_document_id_key UNIQUE (document_id);
    END IF;
END $$;
