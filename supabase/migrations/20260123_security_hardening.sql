-- Migration: 20260123_security_hardening.sql
-- Purpose: Fix "Function Search Path Mutable" vulnerability and ensure RLS consistency.

-- 1. HARDEN SIGNING RPC
-- Adding SET search_path = public, pg_temp to prevent schema hijacking.
CREATE OR REPLACE FUNCTION public.get_document_for_signing(token_uuid text)
RETURNS TABLE (
  id uuid,
  title text,
  file_url text,
  status text,
  signer_email text,
  signer_name text,
  signer_phone text,
  created_at timestamptz,
  expires_at timestamptz,
  security_level text,
  whatsapp_verification boolean,
  user_id uuid,
  issuer_name text,
  issuer_company text,
  issuer_email text,
  issuer_tax_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp -- FIXED: Prevent search_path mutation
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.file_url,
    d.status,
    d.signer_email,
    d.signer_name,
    d.signer_phone,
    d.created_at,
    d.expires_at,
    d.security_level,
    (d.security_level = 'whatsapp_otp') AS whatsapp_verification,
    d.user_id,
    u.name AS issuer_name,
    u.company_name AS issuer_company,
    u.email AS issuer_email,
    u.tax_id AS issuer_tax_id
  FROM public.documents d
  LEFT JOIN public.users u ON d.user_id = u.id
  WHERE d.sign_token = token_uuid;
END;
$$;

-- Grant remains the same, but good practice to ensure.
GRANT EXECUTE ON FUNCTION public.get_document_for_signing(text) TO anon, authenticated, service_role;

-- 2. VERIFY SIGNATURES RLS
-- Explicitly ensure public cannot access signatures (redundant if previous migration ran, but safe).
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = Default deny for everyone except service_role. Correct.
