-- ============================================================
-- FIX: Políticas SELECT para signatures y event_logs
--
-- signatures: nunca tuvo política SELECT, bloqueando la
--   exportación GDPR (Art. 20) desde useDataExport.ts.
--
-- event_logs: la política existente solo cubre logs vinculados
--   a un document_id. Ampliamos para cubrir también logs con
--   user_id directo (eventos de cuenta sin documento asociado).
-- ============================================================

BEGIN;

-- -------------------------------------------------------
-- signatures: usuarios pueden leer firmas de sus documentos
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can view signatures on own documents" ON public.signatures;

CREATE POLICY "Users can view signatures on own documents"
  ON public.signatures
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- event_logs: ampliar para cubrir logs por user_id directo
-- (además del join por document_id que ya existía)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own logs" ON public.event_logs;

CREATE POLICY "Users can view own logs"
  ON public.event_logs
  FOR SELECT
  USING (
    -- Log de documento propio
    (document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = event_logs.document_id
        AND d.user_id = auth.uid()
    ))
    OR
    -- Log de cuenta (sin documento asociado)
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

COMMIT;
