-- Migration: 20260202_mark_document_viewed.sql
-- Purpose: Allow recipients (via token) to mark document as viewed securely.

CREATE OR REPLACE FUNCTION public.mark_document_viewed(token_uuid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to bypass RLS for this specific update
AS $$
DECLARE
  v_doc_id uuid;
BEGIN
  -- 1. Verify token exists and get ID
  SELECT id INTO v_doc_id
  FROM public.documents
  WHERE sign_token = token_uuid
  AND status = 'sent'; -- Only update if currently 'sent'

  IF v_doc_id IS NOT NULL THEN
    -- 2. Update status
    UPDATE public.documents
    SET 
      status = 'viewed',
      viewed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_doc_id;
  END IF;
  
  -- If token invalid or status not 'sent', silently do nothing (security best practice for public endpoints)
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.mark_document_viewed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_document_viewed(text) TO anon, authenticated, service_role;
