-- Migration: Admin Panel Backend RPCs and Policies
-- Description: Adds admin helper function, 8 RPCs for admin operations, and 9 RLS policies
-- Date: 2026-01-29

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_documents', (SELECT COUNT(*) FROM documents),
    'total_signatures', (SELECT COUNT(*) FROM signatures),
    'pending_documents', (SELECT COUNT(*) FROM documents WHERE status = 'sent'),
    'signed_documents', (SELECT COUNT(*) FROM documents WHERE status = 'signed'),
    'expired_documents', (SELECT COUNT(*) FROM documents WHERE status = 'expired'),
    'total_credits_issued', (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE type = 'gift'),
    'total_credits_used', (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE type = 'used'),
    'active_users_30d', (
      SELECT COUNT(DISTINCT user_id)
      FROM documents
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'documents_signed_30d', (
      SELECT COUNT(*)
      FROM documents
      WHERE status = 'signed'
      AND updated_at >= NOW() - INTERVAL '30 days'
    )
  );
$$;

-- List all users with pagination and search
CREATE OR REPLACE FUNCTION admin_list_users(
  search_term TEXT DEFAULT '',
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  company_name TEXT,
  role TEXT,
  onboarding_completed BOOLEAN,
  legal_accepted BOOLEAN,
  created_at TIMESTAMPTZ,
  total_documents BIGINT,
  total_credits BIGINT,
  available_credits BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.name,
    u.company_name,
    u.role,
    u.onboarding_completed,
    u.legal_accepted,
    u.created_at,
    COALESCE(doc_counts.total_docs, 0) as total_documents,
    COALESCE(credit_counts.total_credits, 0) as total_credits,
    COALESCE(credit_counts.available_credits, 0) as available_credits
  FROM users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_docs
    FROM documents
    GROUP BY user_id
  ) doc_counts ON u.id = doc_counts.user_id
  LEFT JOIN (
    SELECT user_id,
           SUM(credits_total) as total_credits,
           SUM(credits_total - credits_used) as available_credits
    FROM credit_packs
    GROUP BY user_id
  ) credit_counts ON u.id = credit_counts.user_id
  WHERE (search_term = '' OR
         u.email ILIKE '%' || search_term || '%' OR
         u.name ILIKE '%' || search_term || '%' OR
         u.company_name ILIKE '%' || search_term || '%')
  ORDER BY u.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

-- Get detailed user information
CREATE OR REPLACE FUNCTION admin_get_user(user_uuid UUID)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'user', json_build_object(
      'id', u.id,
      'email', u.email,
      'name', u.name,
      'company_name', u.company_name,
      'role', u.role,
      'onboarding_completed', u.onboarding_completed,
      'legal_accepted', u.legal_accepted,
      'created_at', u.created_at
    ),
    'stats', json_build_object(
      'total_documents', COALESCE(doc_stats.total_docs, 0),
      'sent_documents', COALESCE(doc_stats.sent_docs, 0),
      'signed_documents', COALESCE(doc_stats.signed_docs, 0),
      'expired_documents', COALESCE(doc_stats.expired_docs, 0),
      'total_credits', COALESCE(credit_stats.total_credits, 0),
      'used_credits', COALESCE(credit_stats.used_credits, 0),
      'available_credits', COALESCE(credit_stats.available_credits, 0)
    ),
    'recent_documents', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', d.id,
          'title', d.title,
          'status', d.status,
          'created_at', d.created_at,
          'signer_email', d.signer_email
        )
      )
      FROM documents d
      WHERE d.user_id = u.id
      ORDER BY d.created_at DESC
      LIMIT 10
    ), '[]'::json),
    'recent_credits', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', ct.id,
          'type', ct.type,
          'amount', ct.amount,
          'description', ct.description,
          'created_at', ct.created_at
        )
      )
      FROM credit_transactions ct
      WHERE ct.user_id = u.id
      ORDER BY ct.created_at DESC
      LIMIT 10
    ), '[]'::json)
  )
  FROM users u
  LEFT JOIN (
    SELECT user_id,
           COUNT(*) as total_docs,
           COUNT(*) FILTER (WHERE status = 'sent') as sent_docs,
           COUNT(*) FILTER (WHERE status = 'signed') as signed_docs,
           COUNT(*) FILTER (WHERE status = 'expired') as expired_docs
    FROM documents
    GROUP BY user_id
  ) doc_stats ON u.id = doc_stats.user_id
  LEFT JOIN (
    SELECT user_id,
           SUM(credits_total) as total_credits,
           SUM(credits_used) as used_credits,
           SUM(credits_total - credits_used) as available_credits
    FROM credit_packs
    GROUP BY user_id
  ) credit_stats ON u.id = credit_stats.user_id
  WHERE u.id = user_uuid;
$$;

-- Grant credits to a user
CREATE OR REPLACE FUNCTION admin_grant_credits(
  target_user_id UUID,
  credit_amount INTEGER,
  description TEXT DEFAULT 'Admin granted credits'
)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  -- Insert credit transaction
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (target_user_id, 'gift', credit_amount, description)
  RETURNING id INTO new_transaction_id;

  -- Update or insert credit pack
  INSERT INTO credit_packs (user_id, pack_type, credits_total, credits_used)
  VALUES (target_user_id, 'admin', credit_amount, 0)
  ON CONFLICT (user_id, pack_type)
  DO UPDATE SET credits_total = credit_packs.credits_total + credit_amount;

  RETURN json_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'message', format('Granted %s credits to user', credit_amount)
  );
END;
$$;

-- Revoke credits from a user
CREATE OR REPLACE FUNCTION admin_revoke_credits(
  target_user_id UUID,
  credit_amount INTEGER,
  description TEXT DEFAULT 'Admin revoked credits'
)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_credits INTEGER;
  new_transaction_id UUID;
BEGIN
  -- Check available credits
  SELECT COALESCE(SUM(credits_total - credits_used), 0)
  INTO available_credits
  FROM credit_packs
  WHERE user_id = target_user_id;

  IF available_credits < credit_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', format('User only has %s available credits, cannot revoke %s', available_credits, credit_amount)
    );
  END IF;

  -- Insert negative credit transaction
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (target_user_id, 'revoked', -credit_amount, description)
  RETURNING id INTO new_transaction_id;

  -- Update credit usage (this will consume credits)
  UPDATE credit_packs
  SET credits_used = credits_used + credit_amount
  WHERE user_id = target_user_id
  AND credits_total - credits_used >= credit_amount
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'message', format('Revoked %s credits from user', credit_amount)
  );
END;
$$;

-- Change user role
CREATE OR REPLACE FUNCTION admin_change_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
BEGIN
  -- Validate role
  IF new_role NOT IN ('user', 'support', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid role. Must be one of: user, support, admin'
    );
  END IF;

  -- Get current role
  SELECT role INTO old_role FROM users WHERE id = target_user_id;

  IF old_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Update role
  UPDATE users SET role = new_role WHERE id = target_user_id;

  -- Log the change
  INSERT INTO event_logs (document_id, event_type, event_data)
  VALUES (
    NULL,
    'admin.role.change',
    json_build_object(
      'admin_user_id', auth.uid(),
      'target_user_id', target_user_id,
      'old_role', old_role,
      'new_role', new_role,
      'changed_at', NOW()
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Changed user role from %s to %s', old_role, new_role)
  );
END;
$$;

-- Get admin event logs
CREATE OR REPLACE FUNCTION admin_get_logs(
  page_size INTEGER DEFAULT 100,
  page_offset INTEGER DEFAULT 0,
  event_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  document_title TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    el.id,
    el.document_id,
    el.event_type,
    el.event_data,
    el.created_at,
    u.email as user_email,
    d.title as document_title
  FROM event_logs el
  LEFT JOIN users u ON (el.event_data->>'user_id')::UUID = u.id
  LEFT JOIN documents d ON el.document_id = d.id
  WHERE (event_type_filter IS NULL OR el.event_type = event_type_filter)
  ORDER BY el.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

-- Get admin Clara conversations
CREATE OR REPLACE FUNCTION admin_get_clara_conversations(
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count BIGINT,
  last_message TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.id as conversation_id,
    cc.user_id,
    u.email as user_email,
    u.name as user_name,
    cc.created_at,
    cc.updated_at,
    COALESCE(msg_counts.message_count, 0) as message_count,
    last_msg.content as last_message
  FROM clara_conversations cc
  JOIN users u ON cc.user_id = u.id
  LEFT JOIN (
    SELECT conversation_id, COUNT(*) as message_count
    FROM clara_messages
    GROUP BY conversation_id
  ) msg_counts ON cc.id = msg_counts.conversation_id
  LEFT JOIN LATERAL (
    SELECT content
    FROM clara_messages
    WHERE conversation_id = cc.id
    ORDER BY created_at DESC
    LIMIT 1
  ) last_msg ON true
  ORDER BY cc.updated_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users table policies for admin access
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update user roles" ON users
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Documents table policies for admin access
CREATE POLICY "Admins can view all documents" ON documents
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all documents" ON documents
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Signatures table policies for admin access
CREATE POLICY "Admins can view all signatures" ON signatures
  FOR SELECT USING (is_admin());

-- Credit packs table policies for admin access
CREATE POLICY "Admins can view all credit packs" ON credit_packs
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all credit packs" ON credit_packs
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Credit transactions table policies for admin access
CREATE POLICY "Admins can view all credit transactions" ON credit_transactions
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (is_admin());

-- Event logs table policies for admin access
CREATE POLICY "Admins can view all event logs" ON event_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert event logs" ON event_logs
  FOR INSERT WITH CHECK (is_admin());

-- Clara conversations table policies for admin access
CREATE POLICY "Admins can view all Clara conversations" ON clara_conversations
  FOR SELECT USING (is_admin());

-- Clara messages table policies for admin access
CREATE POLICY "Admins can view all Clara messages" ON clara_messages
  FOR SELECT USING (is_admin());

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_grant_credits(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_credits(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_logs(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_clara_conversations(INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index for admin user searches
CREATE INDEX IF NOT EXISTS idx_users_email_name_company ON users(email, name, company_name);

-- Index for document status queries
CREATE INDEX IF NOT EXISTS idx_documents_status_created ON documents(status, created_at DESC);

-- Index for credit transaction queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type ON credit_transactions(user_id, type);

-- Index for event log queries
CREATE INDEX IF NOT EXISTS idx_event_logs_type_created ON event_logs(event_type, created_at DESC);

-- Index for Clara conversation queries
CREATE INDEX IF NOT EXISTS idx_clara_conversations_user_updated ON clara_conversations(user_id, updated_at DESC);