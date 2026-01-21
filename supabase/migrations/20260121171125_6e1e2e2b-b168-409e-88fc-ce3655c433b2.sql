-- Add RLS policies for signatures table to enable signing flow

-- 1. Allow public signers to INSERT signatures (they don't have auth.uid())
-- Validation: document must exist, be in correct state, and not expired
CREATE POLICY "public_insert_signatures"
ON public.signatures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id
    AND d.status IN ('sent', 'viewed')
    AND (d.expires_at IS NULL OR d.expires_at > NOW())
  )
);

-- 2. Prevent updates to signatures (signatures are immutable for legal evidence)
CREATE POLICY "signatures_no_update"
ON public.signatures
FOR UPDATE
USING (false);

-- 3. Prevent deletion of signatures (signatures are immutable for legal evidence)
CREATE POLICY "signatures_no_delete"
ON public.signatures
FOR DELETE
USING (false);