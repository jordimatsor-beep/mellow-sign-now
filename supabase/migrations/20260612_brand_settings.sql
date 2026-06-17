-- ============================================================
-- ME-03 · Personalización de marca en los emails al firmante
--
--  Campos de marca en `users` + bucket público para el logo. El bucket es
--  público porque los clientes de email cargan la imagen sin autenticación;
--  la ESCRITURA queda restringida a la carpeta {uid}/ del propio usuario.
-- ============================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS brand_logo_url    TEXT,
  ADD COLUMN IF NOT EXISTS brand_color       TEXT,   -- hex, p. ej. '#2563eb'
  ADD COLUMN IF NOT EXISTS brand_sender_name TEXT;    -- nombre mostrado en el email

-- Bucket público para logos de marca.
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (necesaria para que el email muestre el logo).
DROP POLICY IF EXISTS "Brand logos public read" ON storage.objects;
CREATE POLICY "Brand logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-logos');

-- Escritura/borrado solo del dueño en su carpeta {uid}/...
DROP POLICY IF EXISTS "Brand logos owner insert" ON storage.objects;
CREATE POLICY "Brand logos owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Brand logos owner update" ON storage.objects;
CREATE POLICY "Brand logos owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Brand logos owner delete" ON storage.objects;
CREATE POLICY "Brand logos owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
