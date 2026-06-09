# FirmaClara — Listo para lanzar (runbook de despliegue)

**Fecha:** 9 de junio de 2026 (tarde) · Sustituye al estado de `AUDITORIA_LANZAMIENTO_2026-06-09.md`

Todo lo arreglable por código está **arreglado, testeado y commiteado**: bug de posición de firma, reembolso de créditos roto, API de Nexo (créditos + ownership), secretos fuera del repo, sanitización de errores, HMAC en n8n, CSP endurecida, StealthLogin con verificación de rol y consolas silenciadas. Verificado: 62/62 tests, build de producción OK, parse de las 6 edge functions OK.

Quedan **5 pasos manuales** que requieren tus credenciales (≈30-45 min):

## 1. Rotar claves (10 min) — lo más urgente
En Stripe Dashboard: rotar `sk_live_…` y el webhook secret `whsec_…` → actualizar en Supabase secrets (`STRIPE_SECRET_KEY`) y en el endpoint del webhook. En Resend: rotar `re_…` → `RESEND_API_KEY`. Cambiar la contraseña de jormattor@gmail.com (estaba en `.env.e2e`). La API key de Nexo ya está desactivada en BD por la migración; se reactivará al ejecutar el paso 3.

## 2. Aplicar migración y desplegar funciones (10 min)
```
supabase db push --project-ref pmzfwwtgjvlvuawxguiw
# o ejecutar supabase/migrations/20260609_api_credits_and_refund.sql en el SQL Editor

supabase functions deploy sign-complete-v2 signature-requests send-otp delete-account generate-audit-trail --project-ref pmzfwwtgjvlvuawxguiw
```
Opcional pero recomendado: configurar `N8N_WEBHOOK_SECRET` en Supabase secrets y verificarlo en el flujo n8n. Valorar retirar las funciones legacy `sign-complete` y `send-document-invitation` si siguen desplegadas.

## 3. Reactivar Nexo con clave nueva (5 min) — solo si la integración sigue adelante
Generar claves nuevas y ejecutar `scripts/db/setup_api_client.sql` (incluye vincular el `user_id` de la cuenta cuyos créditos consume la API). Si no sigue adelante, no hacer nada: el cliente queda desactivado.

## 4. Desplegar frontend y regenerar types (5 min)
```
git push origin main          # Vercel despliega solo
npx supabase gen types typescript --project-id pmzfwwtgjvlvuawxguiw > src/integrations/supabase/types.ts
npx tsc -p tsconfig.app.json --noEmit   # deberían quedar 0 errores
```
(Los 40 errores actuales de typecheck son únicamente por types desactualizados; no afectan al build.)

## 5. Prueba real + verificación en Supabase (10 min)
Enviar un documento con "Última página" y otro con "Página específica", firmarlos y comprobar la posición. Forzar un fallo de envío (email inválido tras consumir crédito no es posible — basta vigilar `credit_transactions`: si aparece un `refund`, funciona). En el dashboard de Supabase: Security & Performance Advisors sin críticos, y `SELECT public FROM storage.buckets WHERE id='documents';` debe devolver `false`.

## Documentos pendientes ya enviados
Siguen con `signature_page = 0` (anexo). Si algún cliente espera firma posicionada, reenviar el documento, o ejecutar caso a caso:
```
UPDATE documents SET signature_page = -1 WHERE id = '<id>' AND status IN ('sent','viewed');
```

## Respuesta al cliente que reportó el bug
Borrador listo en `AUDITORIA_LANZAMIENTO_2026-06-09.md` § 2. Enviar tras completar el paso 2.

## Post-lanzamiento (no bloqueante)
Selector visual de posición de firma sobre el PDF (elimina las coordenadas a ciegas) · completar i18n o lanzar solo ES · liberar el scroll-trap por scroll real y reflejarlo en el audit trail · secreto interno dedicado para llamadas entre funciones en lugar del SERVICE_ROLE_KEY · Twilio Verify para OTP.
