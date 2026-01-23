-- Migration: 20260123_fix_rpc_types.sql
-- Purpose: Fix "structure of query does not match function result type" error by adding explicit casts.

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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title::text,
    d.file_url::text,
    d.status::text,
    d.signer_email::text,
    d.signer_name::text,
    COALESCE(d.signer_phone, '')::text,
    d.created_at,
    d.expires_at,
    d.security_level::text,
    (d.security_level = 'whatsapp_otp'),
    d.user_id,
    COALESCE(u.name, '')::text AS issuer_name,
    COALESCE(u.company_name, '')::text AS issuer_company,
    u.email::text AS issuer_email,
    COALESCE(u.tax_id, '')::text AS issuer_tax_id
  FROM public.documents d
  LEFT JOIN public.users u ON d.user_id = u.id
  WHERE d.sign_token = token_uuid;
END;
$$;
