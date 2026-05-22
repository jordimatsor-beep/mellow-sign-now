-- ============================================================
-- SECURITY: Add security_invoker to documents_with_signatures view
-- Prevents IDOR: view now runs with the caller's RLS context,
-- not the definer's (superuser) context.
-- ============================================================

CREATE OR REPLACE VIEW public.documents_with_signatures
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.user_id,
  d.title,
  d.status,
  d.file_url,
  d.signed_file_url,
  d.certificate_url,
  d.signer_name,
  d.signer_email,
  d.signer_phone,
  d.sign_token,
  d.signature_type,
  d.security_level,
  d.expires_at,
  d.sent_at,
  d.signed_at,
  d.created_at,
  d.updated_at,
  s.ip_address   AS signer_ip,
  s.user_agent   AS signer_user_agent,
  s.hash_sha256  AS signature_hash,
  s.tsa_timestamp
FROM public.documents d
LEFT JOIN public.signatures s ON d.id = s.document_id;
