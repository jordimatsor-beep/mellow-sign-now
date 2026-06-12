-- ============================================================
-- ME-04 · Plantillas de documentos
--
--  Una plantilla es un documento con is_template = true. No se envía: se usa
--  para crear un documento nuevo reutilizando su archivo y datos. Se excluyen
--  de los listados normales (dashboard, /documents) filtrando is_template.
--
--  El archivo original es inmutable (el firmado se guarda en signed_file_url),
--  así que el documento creado desde una plantilla puede referenciar el mismo
--  file_url sin riesgo de modificación cruzada.
-- ============================================================

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- Índice parcial para listar plantillas del usuario rápidamente.
CREATE INDEX IF NOT EXISTS idx_documents_templates
  ON public.documents(user_id)
  WHERE is_template = true;

COMMIT;
