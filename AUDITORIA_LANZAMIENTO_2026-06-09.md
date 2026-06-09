# FirmaClara — Auditoría de lanzamiento

**Fecha:** 9 de junio de 2026 · **Alcance:** código completo, bug reportado, tests, build, seguridad, frontend
**Veredicto:** NO-GO hasta resolver los 4 puntos de la sección 1. Con ellos resueltos (≈1 día de trabajo), GO.

---

## 1. Acción inmediata (antes de cualquier lanzamiento)

| # | Acción | Motivo |
|---|--------|--------|
| 1 | **Rotar claves**: Stripe `sk_live_` y `whsec_`, Resend `re_`, API key de Nexo y su webhook secret | Todas están en claro en disco: `.env.local` y `supabase/migrations/20260608_nexo_integration.sql` (verificado después: esta última nunca llegó a commitearse, pero estuvo expuesta fuera del gestor de secretos). Rotarlas es obligatorio, no opcional. |
| 2 | **Desplegar el fix del bug de firma** (sección 2): `supabase functions deploy sign-complete-v2` + deploy del frontend (git push → Vercel) | Bug reportado por cliente. Afecta a todos los documentos enviados hasta hoy. |
| 3 | **Cerrar o terminar la API `signature-requests`** (integración Nexo) | Crea documentos sin `user_id` y **sin consumir créditos** (TODO reconocido en el código, línea 107), y el GET devuelve el estado de cualquier documento por UUID sin comprobar a qué cliente API pertenece. Si no se necesita ya: desactivar el cliente en `api_clients` (`active = false`) y no desplegar la función. |
| 4 | **Cambiar la contraseña de `jormattor@gmail.com`** | Está en texto plano en `.env.e2e` (`15082004J`). Usar cuenta de test desechable para e2e. Verificar si llegó a commitearse: `git log --all -p -- .env.e2e`. |

---

## 2. Bug reportado: la firma nunca aparece en la posición configurada

### Diagnóstico (confirmado con el PDF adjunto del cliente)

El backend (`sign-complete-v2`) soporta 3 modos vía `documents.signature_page`: `0` = página anexa, `-1` = última página, `N` = página concreta con coordenadas. El problema estaba en `src/pages/NewDocument.tsx`:

1. El selector de posición arranca preseleccionado en **"Última página"**, pero el estado interno `signaturePage` se inicializaba a **0** (= anexo). El valor solo se corregía si el usuario *cambiaba* de opción — dejar la preselección no dispara el evento.
2. Al elegir **"Página específica"**, el handler no tenía rama `custom`: `signaturePage` se quedaba en 0 salvo que el usuario editara a mano el número de página.
3. La columna en BD tiene `DEFAULT 0`, así que cualquier vía que no escriba el campo (p. ej. la API `signature-requests`) también acaba en anexo.

Resultado: prácticamente siempre `signature_page = 0` → firma en página anexa, con el campo «Firma:» del documento en blanco. Exactamente lo que reporta el cliente. Además, la página anexa solo dibujaba el título y la imagen, sin ningún dato del firmante (se ve en la pág. 6 de su PDF).

### Fix aplicado (pendiente de commit y deploy)

| Archivo | Cambio |
|---------|--------|
| `src/pages/NewDocument.tsx` | Estado inicial `signaturePage = -1` (coherente con el radio preseleccionado); rama `custom` en el handler (fuerza página ≥ 1 y aplica preset); restauración de borradores tolerante a `null`. |
| `supabase/functions/sign-complete-v2/index.ts` | Página anexa ahora incluye bloque de evidencia (firmante, email, documento, fecha con zona Europe/Madrid, IP); texto bajo la firma posicionada pasa a «Firmado por {nombre} - {fecha}»; sanitizador WinAnsi para que un emoji en el título no rompa el firmado; clamp para que el texto nunca caiga fuera de página. |

### Validación realizada

Simulé el firmado con la lógica nueva sobre el contrato real del cliente (pdf-lib, misma versión): con "página específica" (pág. 5, abajo-derecha) la firma aterriza **dentro del campo «Firma:» de la sección FIRMAS**, con nombre y fecha debajo. Demos generadas: `demo_firma_en_seccion_FIRMAS.pdf` y `demo_anexo_mejorado.pdf`. Tests 62/62 ✓, build de producción ✓, sintaxis de la función ✓.

**Nota:** los documentos ya enviados y pendientes de firma conservan `signature_page = 0` en BD; si quieres que se firmen posicionados, ejecutar: `UPDATE documents SET signature_page = -1 WHERE status IN ('sent','viewed') AND signature_page = 0;` (valorar caso a caso: cambia dónde aparecerá la firma).

**Mejora recomendada (post-lanzamiento):** elegir coordenadas a ciegas es mala UX. Un selector visual (vista previa del PDF donde el usuario arrastra el recuadro de firma) eliminaría esta clase de incidencias.

### Borrador de respuesta al cliente

> Hola,
>
> Gracias por el detalle del reporte y por adjuntar el documento — nos ha permitido reproducirlo de inmediato.
>
> Respondiendo a vuestras tres preguntas: sí, la plataforma está diseñada para incrustar la firma en la posición que elijáis del documento (última página o página y posición concretas), no solo en el anexo. Habéis encontrado un error nuestro: la opción de posición que se mostraba seleccionada no se estaba aplicando al enviar el documento, y la firma acababa siempre en la página anexa. No era un problema de vuestra configuración.
>
> Ya está corregido. A partir de [fecha de deploy], al crear un documento: la opción "Última página" coloca la firma al pie de la última página, y "Página específica" os permite indicar página y posición — para vuestros contratos, la página de la sección FIRMAS. Los envíos que tengáis pendientes de firma creados antes de la corrección seguirán el comportamiento antiguo; si queréis, los reenviamos ya corregidos sin coste de crédito.
>
> Quedamos a vuestra disposición para una llamada y revisar juntos el primer envío.

---

## 3. Estado técnico verificado

| Verificación | Resultado |
|--------------|-----------|
| Tests unitarios (vitest) | **62/62 pasan** (9 archivos), incluyendo los cambios |
| Build de producción (vite) | **OK** en 22 s. Chunk `vendor` de 570 KB (184 KB gzip) — aceptable, mejorable con lazy loading |
| Typecheck (`tsc --noEmit`) | **41 errores**, no bloquean el build (esbuild no typechequea). 38 se deben a una sola causa: `src/integrations/supabase/types.ts` desactualizado (faltan `support_chats`, `support_messages`, `api_clients`…). Fix: `npx supabase gen types typescript --project-id pmzfwwtgjvlvuawxguiw > src/integrations/supabase/types.ts`. Los 3 restantes (SignDocument, CreditsManager, AdminTeam) revisar tras regenerar. |
| Lógica de firma (simulación pdf-lib) | **OK** en los 3 modos (última página / página específica / anexo) |
| Bucket `documents` | Privado por migración `20260522_storage_security.sql`; acceso real vía URLs firmadas. Coherente. El `getPublicUrl` de NewDocument solo se usa como porta-rutas — deuda técnica confusa, no bug. |

**Pendiente de verificar en producción** (el conector Supabase de esta sesión solo accede al proyecto Nexo, no a `pmzfwwtgjvlvuawxguiw`):
`SELECT public FROM storage.buckets WHERE id='documents';` (debe ser `false`) · Security/Performance Advisors del dashboard · que las migraciones de mayo (security_hardening_v2, storage_security) estén aplicadas · logs de `sign-complete-v2` tras el deploy.

---

## 4. Seguridad — hallazgos priorizados

**CRÍTICO** (además de los 4 de la sección 1):
`generate-audit-trail` autentica comparando el bearer con el SERVICE_ROLE_KEY y devuelve `error.message` sin sanitizar; si esa clave se filtra (está en `.env.local`), permite generar certificados fraudulentos para cualquier documento.

**ALTO:**
`send-otp` y `delete-account` devuelven mensajes de error internos sin sanitizar (usar el `sanitizeErrorMessage()` que ya existe en `_shared/cors.ts`). · El webhook a n8n envía datos de firmantes sin HMAC ni secreto — usar la infraestructura de `webhook-dispatch.ts` que ya firma con HMAC-SHA256. · Rate limit de OTP confía en `x-forwarded-for` falsificable como fallback. · `create-checkout-session` lee el precio de `credit_packs` (fila del usuario) en vez del catálogo `pack_types` — si RLS permitiera editar la propia fila, precio manipulable.

**MEDIO:**
CSP con `'unsafe-inline'` en `script-src` (vercel.json) anula la protección XSS. · `SERVICE_ROLE_KEY` usado como bearer entre funciones — crear un secreto interno dedicado. · `send-invite-v2` duplica CORS inline en vez de importar `_shared/cors.ts` (riesgo de desincronización). · `signature-requests` no valida esquema/dominio de `document_url`. · `get_document_for_signing` expone `issuer_tax_id` al firmante anónimo — decidir si es necesario.

**BAJO:** OTP visible en logs de Twilio (valorar Twilio Verify) · `schema.sql` canónico sin RLS para tablas nuevas (la fuente de verdad debe estar completa) · `select('*')` sobre `documents` en sign-complete-v2 · sin `Cache-Control: no-store` para `/sign/*`.

---

## 5. Frontend — hallazgos

**Bloqueantes (rápidos, ~1 h total):**
`console.error` sin guard `import.meta.env.DEV` en AuthContext (l. 59-80), NewDocument (handleSendDocument) y CreditsPurchase — exponen detalles de Supabase/Stripe en consola de producción. · `ErrorBoundary.tsx` l. 67 usa `process.env.NODE_ENV` en vez de `import.meta.env.DEV` (en Vite el bloque de debug puede colarse en producción). · `SignDocument.tsx` l. 345: campo `whatsapp_verification` no declarado en la interfaz `DocumentData`.

**Importantes:**
`StealthLogin` (`/shobdgohs`) no verifica rol antes de navegar: un usuario normal con credenciales válidas llega a renderizar el Dashboard admin un instante antes del rebote. · El parámetro `description` del RPC `consume_credit` no está en los tipos generados — el **reembolso de crédito puede fallar silenciosamente** cuando falla el envío de email (se arregla al regenerar types + verificar firma del RPC en BD). · i18n: la infraestructura existe pero solo 3 páginas la usan; a los locales en/ca/fr/pt les faltan secciones enteras (`contacts`…). Decisión de negocio: lanzar solo en ES (y quitar el selector) o completar traducciones. · El "scroll trap" de lectura del documento se libera por un timer de 5 s, no por scroll real — para una plataforma de firma, el audit trail debería reflejar lectura real.

---

## 6. Checklist de despliegue del fix

```
# 1. Revisar y commitear (2 archivos modificados, sin commitear)
git diff src/pages/NewDocument.tsx supabase/functions/sign-complete-v2/index.ts
git add -A && git commit -m "fix: posicion de firma respeta la seleccion del UI + anexo con metadatos"

# 2. Backend
supabase functions deploy sign-complete-v2 --project-ref pmzfwwtgjvlvuawxguiw

# 3. Frontend (Vercel via git push)
git push origin main

# 4. Regenerar types y verificar
npx supabase gen types typescript --project-id pmzfwwtgjvlvuawxguiw > src/integrations/supabase/types.ts
npx tsc -p tsconfig.app.json --noEmit

# 5. Prueba real: enviar un documento con "Página específica" y firmarlo
```

---

*Generado por Claude (auditoría completa de código, tests y simulación de firmado). Archivos modificados: `src/pages/NewDocument.tsx`, `supabase/functions/sign-complete-v2/index.ts`. Nada commiteado ni desplegado — queda a tu decisión.*
