-- HOTFIX SEGURIDAD: revertir_firma / refund_credit no deben ser invocables por
-- el cliente. Si lo son, un usuario puede consumir una firma (enviar un
-- documento) y acto seguido reembolsarse el crédito => envíos gratis ilimitados.
-- El reembolso por fallo de envío lo hace send-invite-v2 con service_role.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.refund_credit(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_credit(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_credit(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_credit(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.revertir_firma(uuid, uuid, text) TO service_role;

COMMIT;
