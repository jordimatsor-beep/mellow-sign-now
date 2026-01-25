-- Fix for get_document_for_signing RPC
-- We explicitly drop and recreate to ensure return types match exactly.

DROP FUNCTION IF EXISTS get_document_for_signing(uuid);
DROP FUNCTION IF EXISTS get_document_for_signing(text);

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
    d.title,
    d.file_url,
    d.status::text,  -- Force cast to text to avoid enum mismatch
    d.signer_email,
    d.signer_name,
    d.signer_phone,
    d.created_at,
    d.expires_at,
    d.security_level::text, -- Force cast to text
    (d.security_level = 'whatsapp_otp') AS whatsapp_verification,
    d.user_id,
    COALESCE(u.name, '') AS issuer_name,
    COALESCE(u.company_name, '') AS issuer_company,
    u.email AS issuer_email,
    u.tax_id AS issuer_tax_id,
    d.signed_file_url,
    d.certificate_url
  FROM documents d
  JOIN users u ON d.user_id = u.id
  WHERE d.sign_token = token_uuid::text;
END;
$$;
