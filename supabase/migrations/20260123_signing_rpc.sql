-- Migration: 20260123_signing_rpc.sql
-- Purpose: Create a secure RPC to fetch document details by sign_token, bypassing RLS.

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
  issuer_name text,     -- Joined from users
  issuer_company text,  -- Joined from users
  issuer_email text,    -- Joined from users
  issuer_tax_id text    -- Joined from users
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
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
    -- Compatible with older schema if column doesn't exist, we can use security_level logic or null
    -- But since we are selecting specific columns, we must ensure they exist.
    -- Assuming 'whatsapp_verification' might be a boolean column or derived.
    -- Let's check if the column exists in the table definition. 
    -- If it doesn't, we'll return false or rely on security_level.
    -- For safety, let's assume it exists OR strictly rely on security_level logic if we are unifying.
    -- To send a boolean, we can just check security_level.
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

-- Grant revoke from public to be safe, then grant execute
REVOKE EXECUTE ON FUNCTION public.get_document_for_signing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_for_signing(text) TO anon, authenticated, service_role;
