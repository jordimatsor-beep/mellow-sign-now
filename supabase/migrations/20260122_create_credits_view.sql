-- Create view for user credits calculation
-- This view aggregates credits from all packs for each user
-- It uses security_invoker to respect RLS policies of the underlying table

CREATE OR REPLACE VIEW public.user_credits WITH (security_invoker = true) AS
SELECT 
  user_id,
  COALESCE(SUM(credits_total - credits_used), 0) AS available_credits,
  COUNT(*) AS total_packs
FROM public.credit_packs
WHERE credits_total > credits_used
GROUP BY user_id;
