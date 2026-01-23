-- Migration: 20260123_create_storage_bucket.sql
-- Purpose: Ensure the 'documents' bucket exists for local development.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Should be on by default, but good to ensure)
-- Note: 'storage.objects' usually has RLS enabled.

-- 3. Policy: Public Access for Reading (if you want public links to work without signing, 
-- but we are moving to signed URLs. However, 'public' bucket flag above makes it public).
-- Let's ensure basic policies exist for development.

-- Allow public read of everything in 'documents' (We rely on random filenames for security in public buckets usually, 
-- OR strictly signed URLs. If the bucket is public, signed URLs are not strictly needed but good for expiring links).
-- If we want PRIVATE bucket only accessible via Signed URLs:
-- UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- For now, consistent with existing logic (checking for 'public/documents'):
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'documents' );

-- Allow Authenticated users to Upload
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

-- Allow Users to Update their own files
CREATE POLICY "Users Update Own" ON storage.objects
FOR UPDATE
USING ( bucket_id = 'documents' AND owner = auth.uid() );
