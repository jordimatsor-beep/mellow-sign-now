-- ============================================
-- FIX RLS & RPC PERMISSIONS
-- ============================================

-- 1. Fix consume_credit permission
-- The function was failing because it runs as the user (SECURITY INVOKER)
-- and users do not have permissions to UPDATE credit_packs directly.
-- We change it to SECURITY DEFINER to run with postgres/service_role privileges.

CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_pack_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Buscar pack más antiguo con créditos disponibles
  SELECT id INTO v_pack_id
  FROM public.credit_packs
  WHERE user_id = p_user_id
    AND credits_total > credits_used
  ORDER BY purchased_at ASC
  LIMIT 1
  FOR UPDATE;
  
  IF v_pack_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  -- Incrementar créditos usados
  UPDATE public.credit_packs
  SET credits_used = credits_used + 1
  WHERE id = v_pack_id;
  
  -- Calcular restantes
  SELECT COALESCE(SUM(credits_total - credits_used), 0)::INTEGER
  INTO v_remaining
  FROM public.credit_packs
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT TRUE, v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Allow Users to Insert Event Logs
-- event_logs had RLS enabled but no policies, blocking insertions from NewDocument.tsx

CREATE POLICY "Users can insert own event logs" ON public.event_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional: Allow viewing own logs (good for debugging/dashboard history)
CREATE POLICY "Users can view own event logs" ON public.event_logs
  FOR SELECT USING (auth.uid() = user_id);
