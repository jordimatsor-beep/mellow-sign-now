-- Registra el formato original del documento antes de la conversión a PDF.
-- NULL = el usuario subió directamente un PDF (sin conversión).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS original_format VARCHAR(20)
    CHECK (original_format IN ('docx','doc','odt','rtf','xlsx','xls','ods','pptx','ppt','odp','txt','csv'));
