-- Robust Fix for get_document_for_signing RPC
-- Drop all variations to ensure clean slate
DROP FUNCTION IF EXISTS get_document_for_signing(uuid);
DROP FUNCTION IF EXISTS get_document_for_signing(text);

-- Create with explicit OUT parameters to avoid "RETURNS TABLE" ambiguities
CREATE OR REPLACE FUNCTION get_document_for_signing(token_uuid uuid)
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
  issuer_tax_id text,
  signed_file_url text,
  certificate_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    d.signer_phone::text,
    d.created_at::timestamptz,
    d.expires_at::timestamptz,
    d.security_level::text,
    CASE 
      WHEN d.security_level::text = 'whatsapp_otp' THEN true 
      ELSE false 
    END AS whatsapp_verification,
    d.user_id,
    COALESCE(u.name, '')::text AS issuer_name,
    COALESCE(u.company_name, '')::text AS issuer_company,
    u.email::text AS issuer_email,
    u.tax_id::text AS issuer_tax_id,
    d.signed_file_url::text,
    d.certificate_url::text
  FROM documents d
  JOIN users u ON d.user_id = u.id
  WHERE d.sign_token::text = token_uuid::text;
END;
$$;
