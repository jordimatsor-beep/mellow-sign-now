-- ══════════════════════════════════════════════════════════════════════════════
-- FIRMACLARA — Parche de Privacidad y GDPR (junio 2026)
-- ══════════════════════════════════════════════════════════════════════════════
-- Problema detectado: el rol 'admin' tenía acceso sin restricción al contenido
-- privado de los documentos de los usuarios (contratos, emails de firmantes,
-- URLs de PDFs) y a sus conversaciones con Clara (IA).
-- Estos accesos no tienen base legal en GDPR Art. 6 y violan Art. 5(1)(f).
--
-- Fixes:
--   1. Eliminar política RLS "Admins can view all documents"
--   2. Nueva función count-only para estadísticas admin
--   3. Reescribir admin_get_user() sin datos de documentos/firmantes
--   4. Eliminar políticas admin en clara_conversations/clara_messages
--   5. Reescribir admin_get_logs() sin document_title ni event_data sensible
--   6. Bucket 'documents' → privado; nueva política basada en folder del dueño
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Eliminar acceso admin directo a la tabla documents
-- ─────────────────────────────────────────────────────────────────────────────
-- El admin NUNCA necesita leer el título, archivo, email/teléfono del firmante
-- ni el mensaje personalizado de los contratos de usuarios.
-- Las estadísticas van por funciones SECURITY DEFINER específicas.

DROP POLICY IF EXISTS "Admins can view all documents"    ON public.documents;
DROP POLICY IF EXISTS "Admins can update all documents"  ON public.documents;
-- Política ALL descubierta en auditoría — da acceso de lectura+escritura completo al admin
DROP POLICY IF EXISTS "Admins only"                      ON public.documents;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función count-only para panel de usuarios (UsersManager)
-- ─────────────────────────────────────────────────────────────────────────────
-- Devuelve solo {user_id, doc_count} — sin título, sin firmante, sin URL.

CREATE OR REPLACE FUNCTION public.admin_get_document_counts(p_user_ids UUID[])
RETURNS TABLE (user_id UUID, doc_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT d.user_id, COUNT(*)::BIGINT
  FROM public.documents d
  WHERE d.user_id = ANY(p_user_ids)
  GROUP BY d.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_document_counts(UUID[]) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Reescribir admin_get_user() — eliminar recent_documents y recent_credits
-- ─────────────────────────────────────────────────────────────────────────────
-- La versión anterior devolvía: title + signer_email de los 10 últimos docs.
-- La nueva solo devuelve: perfil del usuario + estadísticas anónimas (counts).

CREATE OR REPLACE FUNCTION public.admin_get_user(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT json_build_object(
    'user', json_build_object(
      'id',                    u.id,
      'email',                 u.email,
      'name',                  u.name,
      'company_name',          u.company_name,
      'role',                  u.role,
      'plan_id',               u.plan_id,
      'subscription_status',   u.subscription_status,
      'onboarding_completed',  u.onboarding_completed,
      'legal_accepted',        u.legal_accepted,
      'legal_accepted_at',     u.legal_accepted_at,
      'created_at',            u.created_at,
      'updated_at',            u.updated_at
    ),
    'stats', json_build_object(
      'total_documents',   COALESCE(doc_stats.total_docs,    0),
      'sent_documents',    COALESCE(doc_stats.sent_docs,     0),
      'signed_documents',  COALESCE(doc_stats.signed_docs,   0),
      'expired_documents', COALESCE(doc_stats.expired_docs,  0),
      'firmas_creditos',   u.firmas_creditos,
      'firmas_usadas_mes', u.firmas_usadas_mes
    )
    -- ELIMINADO: 'recent_documents' (exponía title + signer_email)
    -- ELIMINADO: 'recent_credits'   (información financiera interna)
  ) INTO v_result
  FROM public.users u
  LEFT JOIN (
    SELECT d.user_id,
           COUNT(*)                                          AS total_docs,
           COUNT(*) FILTER (WHERE d.status = 'sent')        AS sent_docs,
           COUNT(*) FILTER (WHERE d.status = 'signed')      AS signed_docs,
           COUNT(*) FILTER (WHERE d.status = 'expired')     AS expired_docs
    FROM public.documents d
    WHERE d.user_id = user_uuid
    GROUP BY d.user_id
  ) doc_stats ON u.id = doc_stats.user_id
  WHERE u.id = user_uuid;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Eliminar acceso admin a conversaciones de Clara (IA)
-- ─────────────────────────────────────────────────────────────────────────────
-- Las conversaciones con el asistente IA son privadas y confidenciales.
-- El operador no tiene base legal para leerlas (GDPR Art. 6).

DROP POLICY IF EXISTS "Admins can view all Clara conversations" ON public.clara_conversations;
DROP POLICY IF EXISTS "Admins can view all Clara messages"      ON public.clara_messages;

-- Revocar ejecución de la función que expone contenido de mensajes
REVOKE EXECUTE ON FUNCTION public.admin_get_clara_conversations(INTEGER, INTEGER)
  FROM authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Reescribir admin_get_logs() — eliminar document_title y event_data
-- ─────────────────────────────────────────────────────────────────────────────
-- La versión anterior unía con documents para devolver document_title,
-- y devolvía event_data JSONB completo (puede incluir signer_email, etc.).
-- Los logs de auditoría solo necesitan tipo de evento, usuario y timestamp.

-- DROP necesario porque cambiamos la firma de retorno
DROP FUNCTION IF EXISTS public.admin_get_logs(INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.admin_get_logs(
  page_size         INTEGER DEFAULT 100,
  page_offset       INTEGER DEFAULT 0,
  event_type_filter TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  document_id  UUID,
  event_type   TEXT,
  created_at   TIMESTAMPTZ,
  user_email   TEXT
  -- ELIMINADO: event_data    (puede contener emails de firmantes, títulos)
  -- ELIMINADO: document_title (información privada del usuario)
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    el.id,
    el.document_id,
    el.event_type,
    el.created_at,
    u.email AS user_email
  FROM public.event_logs el
  LEFT JOIN public.users u ON el.user_id = u.id
  WHERE (event_type_filter IS NULL OR el.event_type = event_type_filter)
  ORDER BY el.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_logs(INTEGER, INTEGER, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Bucket 'documents' → privado
-- ─────────────────────────────────────────────────────────────────────────────
-- El bucket era public=true con política "Public Access" sin autenticación,
-- lo que permitía a cualquiera con la URL descargar contratos de usuarios.

UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Eliminar política que permitía lectura pública sin autenticación
DROP POLICY IF EXISTS "Public Access"       ON storage.objects;
DROP POLICY IF EXISTS "Documents Public Read" ON storage.objects;

-- Nueva política: el propietario de la carpeta puede leer sus archivos.
-- Los archivos siguen el patrón: {user_id}/nombre-del-archivo.pdf
-- Las Edge Functions usan service_role que bypasa RLS por diseño.
CREATE POLICY "Owner reads own files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Auditoría: registrar este cambio de seguridad
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_change_logs (event_time, command_tag, object_identity, schema_name, user_name)
VALUES (
  now(),
  'SECURITY_PATCH',
  'gdpr_privacy_patch_20260620',
  'public',
  'migration'
);
