-- ============================================================
-- SECURITY: Make documents bucket private + tighten policies
-- Prevents unauthenticated access to document files
-- ============================================================

-- 1. Make bucket private (requires auth or signed URL)
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 2. Drop the overly permissive public-read policy
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 3. Drop and recreate upload policy: restrict to owner's path prefix
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Users upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Drop and recreate read policy: only the document owner can read their files
DROP POLICY IF EXISTS "Users Update Own" ON storage.objects;
CREATE POLICY "Owners read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow owners to update their own files
CREATE POLICY "Owners update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: service_role bypasses RLS, so sign-complete-v2 (which uses service_role)
-- can still upload/download any file. The get-file-for-signing Edge Function
-- also uses service_role to generate signed URLs for unauthenticated signers.
