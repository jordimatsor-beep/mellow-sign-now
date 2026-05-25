-- ============================================================
-- SECURITY HARDENING v2 — 2026-05-25
-- Fixes aplicados:
--   CRIT-1 : 7 admin RPCs sin verificación de admin → auth check añadido
--   CRIT-2 : get_admin_stats() y get_admin_stats(text) sin auth → parcheados
--   HIGH-1  : credit_transactions INSERT policy permisiva → eliminada
--   MED-2   : pack_types sin RLS → habilitado
--   MED-3   : handle_updated_at() puede no existir → creada/reemplazada
--   MED-4   : índices críticos faltantes → creados
--   MED-5   : bucket 'documents' sin límites de tamaño/MIME → configurado
--   EXTRA   : get_available_credits SET search_path; funciones auxiliares
--             cleanup_old_drafts y mark_expired_documents con SET search_path
-- ============================================================

BEGIN;

-- ============================================================
-- MED-3: Garantizar que handle_updated_at() existe
-- (alias de update_updated_at_column para triggers creados en migraciones
--  posteriores al schema original)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- CRIT-1a: admin_list_users — añadir auth check + fijar JOIN a user_credit_purchases
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  search_term  TEXT    DEFAULT '',
  page_size    INTEGER DEFAULT 50,
  page_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                   UUID,
  email                TEXT,
  name                 TEXT,
  company_name         TEXT,
  role                 TEXT,
  onboarding_completed BOOLEAN,
  legal_accepted       BOOLEAN,
  created_at           TIMESTAMPTZ,
  total_documents      BIGINT,
  total_credits        BIGINT,
  available_credits    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Evitar page_size abusivos
  IF page_size > 200 THEN
    page_size := 200;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.name::TEXT,
    u.company_name::TEXT,
    u.role::TEXT,
    u.onboarding_completed,
    u.legal_accepted,
    u.created_at,
    COALESCE(doc_counts.total_docs,            0::BIGINT),
    COALESCE(credit_counts.total_credits,      0::BIGINT),
    COALESCE(credit_counts.available_credits,  0::BIGINT)
  FROM public.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*)::BIGINT AS total_docs
    FROM public.documents
    GROUP BY user_id
  ) doc_counts ON u.id = doc_counts.user_id
  LEFT JOIN (
    SELECT
      user_id,
      SUM(credits_total)::BIGINT              AS total_credits,
      SUM(credits_total - credits_used)::BIGINT AS available_credits
    FROM public.user_credit_purchases
    GROUP BY user_id
  ) credit_counts ON u.id = credit_counts.user_id
  WHERE (
    search_term = ''
    OR u.email        ILIKE '%' || search_term || '%'
    OR u.name         ILIKE '%' || search_term || '%'
    OR u.company_name ILIKE '%' || search_term || '%'
  )
  ORDER BY u.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- ============================================================
-- CRIT-1b: admin_get_user — añadir auth check + fijar JOIN a user_credit_purchases
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_user(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT json_build_object(
    'user', json_build_object(
      'id',                    u.id,
      'email',                 u.email,
      'name',                  u.name,
      'company_name',          u.company_name,
      'role',                  u.role,
      'onboarding_completed',  u.onboarding_completed,
      'legal_accepted',        u.legal_accepted,
      'created_at',            u.created_at
    ),
    'stats', json_build_object(
      'total_documents',   COALESCE(doc_stats.total_docs,        0),
      'sent_documents',    COALESCE(doc_stats.sent_docs,         0),
      'signed_documents',  COALESCE(doc_stats.signed_docs,       0),
      'expired_documents', COALESCE(doc_stats.expired_docs,      0),
      'total_credits',     COALESCE(credit_stats.total_credits,  0),
      'used_credits',      COALESCE(credit_stats.used_credits,   0),
      'available_credits', COALESCE(credit_stats.available_credits, 0)
    ),
    'recent_documents', COALESCE((
      SELECT json_agg(docs_row)
      FROM (
        SELECT json_build_object(
          'id',           d.id,
          'title',        d.title,
          'status',       d.status,
          'created_at',   d.created_at,
          'signer_email', d.signer_email
        ) AS docs_row
        FROM public.documents d
        WHERE d.user_id = u.id
        ORDER BY d.created_at DESC
        LIMIT 10
      ) recent_docs
    ), '[]'::json),
    'recent_credits', COALESCE((
      SELECT json_agg(ct_row)
      FROM (
        SELECT json_build_object(
          'id',          ct.id,
          'type',        ct.type,
          'amount',      ct.amount,
          'description', ct.description,
          'created_at',  ct.created_at
        ) AS ct_row
        FROM public.credit_transactions ct
        WHERE ct.user_id = u.id
        ORDER BY ct.created_at DESC
        LIMIT 10
      ) recent_ct
    ), '[]'::json)
  ) INTO v_result
  FROM public.users u
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*)                                         AS total_docs,
      COUNT(*) FILTER (WHERE status = 'sent')          AS sent_docs,
      COUNT(*) FILTER (WHERE status = 'signed')        AS signed_docs,
      COUNT(*) FILTER (WHERE status = 'expired')       AS expired_docs
    FROM public.documents
    GROUP BY user_id
  ) doc_stats ON u.id = doc_stats.user_id
  LEFT JOIN (
    SELECT
      user_id,
      SUM(credits_total)              AS total_credits,
      SUM(credits_used)               AS used_credits,
      SUM(credits_total - credits_used) AS available_credits
    FROM public.user_credit_purchases
    GROUP BY user_id
  ) credit_stats ON u.id = credit_stats.user_id
  WHERE u.id = user_uuid;

  RETURN v_result;
END;
$$;

-- ============================================================
-- CRIT-1c: admin_get_clara_conversations — añadir auth check
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_clara_conversations(
  page_size   INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  user_id         UUID,
  user_email      TEXT,
  user_name       TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  message_count   BIGINT,
  last_message    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF page_size > 200 THEN
    page_size := 200;
  END IF;

  RETURN QUERY
  SELECT
    cc.id            AS conversation_id,
    cc.user_id,
    u.email::TEXT    AS user_email,
    u.name::TEXT     AS user_name,
    cc.created_at,
    cc.updated_at,
    COALESCE(msg_counts.message_count, 0::BIGINT) AS message_count,
    last_msg.content::TEXT                         AS last_message
  FROM public.clara_conversations cc
  JOIN public.users u ON cc.user_id = u.id
  LEFT JOIN (
    SELECT conversation_id, COUNT(*)::BIGINT AS message_count
    FROM public.clara_messages
    GROUP BY conversation_id
  ) msg_counts ON cc.id = msg_counts.conversation_id
  LEFT JOIN LATERAL (
    SELECT content
    FROM public.clara_messages
    WHERE conversation_id = cc.id
    ORDER BY created_at DESC
    LIMIT 1
  ) last_msg ON true
  ORDER BY cc.updated_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- ============================================================
-- CRIT-1d: admin_get_logs — añadir auth check
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_logs(
  page_size         INTEGER DEFAULT 100,
  page_offset       INTEGER DEFAULT 0,
  event_type_filter TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  document_id    UUID,
  event_type     TEXT,
  event_data     JSONB,
  created_at     TIMESTAMPTZ,
  user_email     TEXT,
  document_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF page_size > 500 THEN
    page_size := 500;
  END IF;

  RETURN QUERY
  SELECT
    el.id,
    el.document_id,
    el.event_type,
    el.event_data,
    el.created_at,
    u.email::TEXT  AS user_email,
    d.title::TEXT  AS document_title
  FROM public.event_logs el
  LEFT JOIN public.users u
    ON (el.event_data->>'user_id')::UUID = u.id
  LEFT JOIN public.documents d
    ON el.document_id = d.id
  WHERE (event_type_filter IS NULL OR el.event_type = event_type_filter)
  ORDER BY el.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- ============================================================
-- CRIT-1e: admin_grant_credits — añadir auth check + fijar tabla a user_credit_purchases
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  target_user_id UUID,
  credit_amount  INTEGER,
  description    TEXT DEFAULT 'Admin granted credits'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF credit_amount <= 0 OR credit_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid credit amount (must be 1–10000)';
  END IF;

  -- Verificar que el usuario destino existe
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Registrar transacción
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (target_user_id, 'gift', credit_amount, description)
  RETURNING id INTO new_transaction_id;

  -- Insertar en el ledger de compras (tabla canónica)
  INSERT INTO public.user_credit_purchases
    (user_id, pack_type, credits_total, credits_used, price_paid)
  VALUES
    (target_user_id, 'admin_gift', credit_amount, 0, 0);

  -- Audit log
  INSERT INTO public.event_logs (event_type, event_data, user_id)
  VALUES (
    'admin.credits.grant',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'amount',         credit_amount,
      'description',    description,
      'admin_id',       auth.uid()
    ),
    auth.uid()
  );

  RETURN json_build_object(
    'success',        true,
    'transaction_id', new_transaction_id,
    'message',        format('Granted %s credits', credit_amount)
  );
END;
$$;

-- ============================================================
-- CRIT-1f: admin_revoke_credits — añadir auth check + fijar tabla
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_credits(
  target_user_id UUID,
  credit_amount  INTEGER,
  description    TEXT DEFAULT 'Admin revoked credits'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available        INTEGER;
  new_transaction_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT COALESCE(SUM(credits_total - credits_used), 0)
  INTO v_available
  FROM public.user_credit_purchases
  WHERE user_id = target_user_id;

  IF v_available < credit_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', format(
        'El usuario solo tiene %s créditos disponibles, no se pueden revocar %s',
        v_available, credit_amount
      )
    );
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (target_user_id, 'revoked', -credit_amount, description)
  RETURNING id INTO new_transaction_id;

  -- FIFO: consumir del pack más antiguo con saldo suficiente
  UPDATE public.user_credit_purchases
  SET credits_used = credits_used + credit_amount
  WHERE id = (
    SELECT id
    FROM public.user_credit_purchases
    WHERE user_id = target_user_id
      AND (credits_total - credits_used) >= credit_amount
    ORDER BY created_at ASC
    LIMIT 1
  );

  RETURN json_build_object(
    'success',        true,
    'transaction_id', new_transaction_id,
    'message',        format('Revoked %s credits', credit_amount)
  );
END;
$$;

-- ============================================================
-- CRIT-1g: admin_change_role — añadir auth check explícito
-- (defensa en profundidad: el trigger guard_user_update ya lo bloquea,
--  pero la función debe fallar antes de llegar al UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_change_role(
  target_user_id UUID,
  new_role        TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF new_role NOT IN ('user', 'support', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Rol inválido. Debe ser: user, support o admin'
    );
  END IF;

  SELECT role INTO old_role FROM public.users WHERE id = target_user_id;
  IF old_role IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no encontrado');
  END IF;

  -- Protección: no permitir degradar al último admin
  IF old_role = 'admin' AND new_role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != target_user_id) = 0 THEN
      RAISE EXCEPTION 'No se puede degradar al único administrador';
    END IF;
  END IF;

  UPDATE public.users SET role = new_role WHERE id = target_user_id;

  INSERT INTO public.event_logs (event_type, event_data, user_id)
  VALUES (
    'admin.role.change',
    jsonb_build_object(
      'admin_id',        auth.uid(),
      'target_user_id',  target_user_id,
      'old_role',        old_role,
      'new_role',        new_role
    ),
    auth.uid()
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Rol cambiado: %s → %s', old_role, new_role)
  );
END;
$$;

-- ============================================================
-- CRIT-2a: get_admin_stats() sin parámetro — añadir auth check
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN (
    SELECT json_build_object(
      'total_users',       (SELECT COUNT(*) FROM public.users),
      'total_documents',   (SELECT COUNT(*) FROM public.documents),
      'total_signatures',  (SELECT COUNT(*) FROM public.signatures),
      'pending_documents', (SELECT COUNT(*) FROM public.documents WHERE status = 'sent'),
      'signed_documents',  (SELECT COUNT(*) FROM public.documents WHERE status = 'signed'),
      'expired_documents', (SELECT COUNT(*) FROM public.documents WHERE status = 'expired'),
      'total_credits_issued', (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.credit_transactions WHERE type = 'gift'
      ),
      'total_credits_used', (
        SELECT COALESCE(ABS(SUM(amount)), 0)
        FROM public.credit_transactions WHERE type = 'usage'
      ),
      'active_users_30d', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.documents
        WHERE created_at >= NOW() - INTERVAL '30 days'
      ),
      'documents_signed_30d', (
        SELECT COUNT(*)
        FROM public.documents
        WHERE status = 'signed'
          AND updated_at >= NOW() - INTERVAL '30 days'
      )
    )
  );
END;
$$;

-- ============================================================
-- CRIT-2b: get_admin_stats(text) con período — añadir auth check
--          + fijar tabla a user_credit_purchases
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats(p_period text DEFAULT '30d')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date      TIMESTAMPTZ;
  v_prev_start_date TIMESTAMPTZ;
  v_end_date        TIMESTAMPTZ := NOW();
  v_revenue         NUMERIC     := 0;
  v_active_users    INTEGER     := 0;
  v_credits_sold    INTEGER     := 0;
  v_docs_signed     INTEGER     := 0;
  v_prev_revenue    NUMERIC     := 0;
  v_revenue_growth  NUMERIC     := 0;
  v_chart_data      JSONB;
  v_top_customers   JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  CASE p_period
    WHEN 'today' THEN
      v_start_date      := DATE_TRUNC('day', NOW());
      v_prev_start_date := v_start_date - INTERVAL '1 day';
    WHEN 'year' THEN
      v_start_date      := DATE_TRUNC('year', NOW());
      v_prev_start_date := v_start_date - INTERVAL '1 year';
    ELSE -- '30d' y cualquier otro
      v_start_date      := NOW() - INTERVAL '30 days';
      v_prev_start_date := v_start_date - INTERVAL '30 days';
  END CASE;

  -- Ingresos y créditos del período
  SELECT
    COALESCE(SUM(price_paid), 0),
    COALESCE(SUM(credits_total), 0)
  INTO v_revenue, v_credits_sold
  FROM public.user_credit_purchases
  WHERE created_at >= v_start_date
    AND created_at <= v_end_date;

  -- Ingresos del período anterior (para calcular crecimiento)
  SELECT COALESCE(SUM(price_paid), 0)
  INTO v_prev_revenue
  FROM public.user_credit_purchases
  WHERE created_at >= v_prev_start_date
    AND created_at <  v_start_date;

  IF v_prev_revenue > 0 THEN
    v_revenue_growth := ROUND(
      ((v_revenue - v_prev_revenue) / v_prev_revenue) * 100, 1
    );
  END IF;

  -- Usuarios activos (con algún evento en el período)
  SELECT COUNT(DISTINCT user_id)
  INTO v_active_users
  FROM public.event_logs
  WHERE created_at >= v_start_date
    AND created_at <= v_end_date;

  -- Documentos firmados en el período
  SELECT COUNT(*)
  INTO v_docs_signed
  FROM public.documents
  WHERE status = 'signed'
    AND signed_at >= v_start_date
    AND signed_at <= v_end_date;

  -- Datos de gráfico (serie temporal)
  WITH time_series AS (
    SELECT date_trunc(
      CASE WHEN p_period = 'today' THEN 'hour' ELSE 'day' END,
      series
    ) AS bucket
    FROM generate_series(
      v_start_date, v_end_date,
      CASE WHEN p_period = 'today'
        THEN '1 hour'::interval
        ELSE '1 day'::interval
      END
    ) AS series
  ),
  revenue_data AS (
    SELECT
      date_trunc(
        CASE WHEN p_period = 'today' THEN 'hour' ELSE 'day' END,
        created_at
      ) AS bucket,
      SUM(price_paid)    AS revenue,
      SUM(credits_total) AS credits
    FROM public.user_credit_purchases
    WHERE created_at >= v_start_date
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'date',    ts.bucket,
    'revenue', COALESCE(rd.revenue,  0),
    'credits', COALESCE(rd.credits, 0)
  ))
  INTO v_chart_data
  FROM time_series ts
  LEFT JOIN revenue_data rd ON ts.bucket = rd.bucket;

  -- Top 5 clientes por gasto en el período
  SELECT jsonb_agg(t)
  INTO v_top_customers
  FROM (
    SELECT
      u.email,
      u.company_name,
      SUM(p.price_paid)    AS total_spend,
      SUM(p.credits_total) AS total_credits
    FROM public.user_credit_purchases p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.created_at >= v_start_date
    GROUP BY u.id, u.email, u.company_name
    ORDER BY total_spend DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'revenue',         v_revenue,
    'revenue_growth',  v_revenue_growth,
    'active_users',    v_active_users,
    'credits_sold',    v_credits_sold,
    'docs_signed',     v_docs_signed,
    'chart_data',      COALESCE(v_chart_data,    '[]'::jsonb),
    'top_customers',   COALESCE(v_top_customers, '[]'::jsonb)
  );
END;
$$;

-- ============================================================
-- HIGH-1: Eliminar política INSERT permisiva en credit_transactions
-- Los usuarios solo leen; las inserciones ocurren solo desde funciones
-- SECURITY DEFINER (consume_credit, admin_grant_credits, stripe-webhook, etc.)
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;

-- ============================================================
-- MED-2: Habilitar RLS en pack_types (tabla de referencia sin RLS)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pack_types'
  ) THEN
    ALTER TABLE public.pack_types ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Public read pack_types" ON public.pack_types;
CREATE POLICY "Public read pack_types"
  ON public.pack_types
  FOR SELECT
  USING (true);

-- ============================================================
-- MED-4a: Índice crítico — user_credit_purchases(user_id)
-- (cada consulta de créditos hace seq scan sin este índice)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_credit_purchases_user_id
  ON public.user_credit_purchases(user_id);

-- Índice FIFO para consume_credit (ORDER BY created_at ASC con filtro de saldo)
CREATE INDEX IF NOT EXISTS idx_user_credit_purchases_fifo
  ON public.user_credit_purchases(user_id, created_at ASC)
  WHERE (credits_total - credits_used) > 0;

-- ============================================================
-- MED-4b: Índice — support_messages(created_at DESC)
-- (ordenación de mensajes en chat de soporte)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
  ON public.support_messages(created_at DESC);

-- ============================================================
-- MED-4c: Índice — credit_transactions(document_id)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_credit_transactions_document_id
  ON public.credit_transactions(document_id)
  WHERE document_id IS NOT NULL;

-- ============================================================
-- MED-4d: GIN trigram para búsquedas ILIKE en admin_list_users
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON public.users USING gin(email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_name_trgm
  ON public.users USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_company_trgm
  ON public.users USING gin(company_name gin_trgm_ops);

-- ============================================================
-- MED-5: Límites de tamaño y tipos MIME en bucket 'documents'
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit    = 10485760,   -- 10 MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
WHERE id = 'documents';

-- ============================================================
-- EXTRA: get_available_credits — asegurar SET search_path consistente
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_available_credits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_credits integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(credits_total - credits_used), 0)
  INTO v_credits
  FROM public.user_credit_purchases
  WHERE user_id = v_user_id
    AND (expires_at IS NULL OR expires_at > now());

  RETURN v_credits;
END;
$$;

-- ============================================================
-- EXTRA: cleanup_old_drafts — añadir SET search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.documents
  WHERE status = 'draft'
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO public.event_logs (event_type, event_data)
  VALUES (
    'system.cleanup_drafts',
    jsonb_build_object('deleted_count', deleted_count, 'ran_at', NOW())
  );

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_drafts() TO service_role;

-- ============================================================
-- EXTRA: mark_expired_documents — añadir SET search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_expired_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.documents
  SET status = 'expired'
  WHERE status IN ('sent', 'viewed')
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_expired_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_expired_documents() TO service_role;

COMMIT;
