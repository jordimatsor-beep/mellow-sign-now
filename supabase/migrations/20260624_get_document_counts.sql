-- Función RPC: devuelve total/pending/signed de documentos del usuario actual
-- en una sola query GROUP BY, sustituyendo las 3 queries paralelas del dashboard.
CREATE OR REPLACE FUNCTION get_document_counts()
RETURNS TABLE(
  total   BIGINT,
  pending BIGINT,
  signed  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COUNT(*)                                                   AS total,
    COUNT(*) FILTER (WHERE status IN ('sent', 'viewed'))       AS pending,
    COUNT(*) FILTER (WHERE status = 'signed')                  AS signed
  FROM documents
  WHERE user_id = auth.uid()
    AND is_template = false;
$$;

REVOKE ALL ON FUNCTION get_document_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_document_counts() TO authenticated;
