-- Hook requerido por Supabase Auth (Dashboard → Authentication → Hooks).
-- Configurado como pg-functions://postgres/public/custom_access_token_hook
-- pero la función no existía → toda la autenticación fallaba.
-- Esta implementación es passthrough puro: devuelve el JWT sin modificarlo.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN event;
END;
$$;

-- Permisos requeridos por Supabase Auth para invocar el hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
