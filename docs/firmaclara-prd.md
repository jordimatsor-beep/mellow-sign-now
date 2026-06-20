# PRD: FirmaClara
## Plataforma de Envío y Firma Electrónica con Certificación Técnica de Evidencias

**Versión:** 2.1 (auditoría exhaustiva del código + saneamiento para compartir)
**Fecha:** Junio 2026
**Propietario:** OPERIA
**Estado:** En producción · plataforma SaaS independiente (standalone)
**Clasificación:** Documento compartible — **saneado de secretos** (sin claves, sin URLs internas, sin rutas privadas ni mecanismos de ofuscación)

> **⚠️ Aviso de confidencialidad y saneamiento:** Este PRD está pensado para **compartirse externamente**. No contiene contraseñas, claves de API, tokens, cadenas de conexión, enlaces internos ni la ruta real del panel de administración. Los elementos basados en *seguridad por ofuscación* (ruta privada y pantalla de acceso enmascarada del panel admin) se describen funcionalmente pero **no se revelan**, ya que su divulgación anularía su único propósito. Para configuración con valores reales, ver el repositorio privado y el gestor de secretos del proyecto (no incluidos aquí).

> **Nota de versión (v1.0 → v2.0):** El PRD v1.0 (enero 2025) describía una herramienta integrada en el panel de Multicentros, construida sobre "Lovable + Antigravity", con un modelo de **packs de créditos de pago único**. La implementación real ha divergido sustancialmente: FirmaClara es hoy una **plataforma SaaS independiente** (autenticación propia, dominio propio) construida sobre **Vite/React + Supabase Edge Functions (Deno)**, con un **modelo de planes de suscripción + overage**, conversión multiformato, OTP multicanal, sellado de tiempo multi-proveedor, API pública para terceros, panel de administración y soporte en vivo. Este documento refleja el sistema **tal y como está construido en el código** (auditado archivo por archivo, ver §11 y §12).

---

## 1. Resumen Ejecutivo

### 1.1 Visión del Producto

FirmaClara es una plataforma de envío y firma electrónica con **certificación técnica de evidencias**, diseñada para autónomos y pequeñas pymes en España. Permite enviar cualquier documento (PDF u Office) para que un cliente lo firme online en menos de un minuto, desde el móvil y sin registro, generando un PDF firmado más un **certificado de evidencias con sellado de tiempo RFC 3161** que prueba quién firmó, cuándo, desde dónde y que el documento no ha sido alterado.

### 1.2 Propuesta de Valor

**Para el emisor (autónomo/pyme):**
- Envío para firma en segundos, desde PDF o desde Word/Excel/PowerPoint (conversión automática a PDF)
- Colocación visual de la firma en el punto exacto del documento
- Agenda de contactos, plantillas reutilizables y borradores
- Verificación reforzada opcional por **código OTP (SMS/WhatsApp/email)**
- Personalización de marca (logo, color, remitente) en los emails al firmante
- Prueba técnica verificable y descargable de cada firma
- Asistente IA (Clara) gratuito para redactar y revisar documentos

**Para el firmante (cliente del emisor):**
- Firma desde el móvil en menos de 1 minuto
- Sin registro ni instalar apps
- Visor del PDF integrado y firma manuscrita sobre lienzo

### 1.3 Diferenciación

| Aspecto | Competencia (Signaturit, Firmafy) | FirmaClara |
|---|---|---|
| Tipo de firma | Avanzada (OTP, biometría) | Simple + evidencias técnicas (OTP opcional) |
| Precio | 24-30 €/mes + compromiso anual | Desde 0 €/mes; planes 9-19 €; pack puntual 15 € |
| Multiformato | Limitado | PDF + Word/Excel/PPT/ODF/RTF/TXT/CSV |
| Asistente IA | No | Sí (Clara) |
| API para terceros | Enterprise | Sí (REST + webhooks firmados HMAC) |
| Target | Empresas medianas | Autónomos y micropymes |

### 1.4 Modelo de Negocio (resumen)

Modelo **freemium con suscripción + overage + pack puntual** (detalle completo en §8):

| Plan | Precio | Firmas incluidas | Extra |
|---|---|---|---|
| Gratis | 0 €/mes | 2 firmas/mes | — (bloqueo al límite) |
| Básico | 9 €/mes | 10 firmas/mes | — (bloqueo al límite) |
| Profesional | 19 €/mes | 50 firmas/mes | 0,40 €/firma adicional (overage) |
| Pack puntual | 15 € (pago único) | 15 firmas que **no caducan** | Se consume antes que la cuota |

**Regla de negocio nuclear:** se consume **1 firma al ENVIAR** el documento (no al firmarlo). Clara es gratis e ilimitada. Los documentos expiran a los 30 días (configurable 3-30) si no se firman.

---

## 2. Estado de Implementación

Resumen del estado real de cada bloque funcional (para alinear expectativas de despliegue):

| Bloque | Estado código | Notas de despliegue |
|---|---|---|
| Firma electrónica + PDF firmado | ✅ Implementado | En producción (`sign-complete-v2`) |
| Certificado de evidencias + multi-TSA | ✅ Implementado | En producción (`generate-audit-trail`, `request-tsa`) |
| Conversión Office→PDF (Gotenberg) | ✅ Implementado | Gotenberg **self-hosted en VPS**; revisar sincronía de secrets (`GOTENBERG_URL`/`GOTENBERG_TOKEN`) |
| Modelo de planes + overage | ✅ Implementado (migraciones + funciones) | **Pendiente de despliegue completo**; `consumir_firma()` es el núcleo, los wrappers (`consume_credit`, etc.) delegan en él |
| OTP multicanal (SMS/WhatsApp/email) | ✅ Implementado | En producción (`send-otp`, Twilio + Resend) |
| Clara (IA) vía n8n | ✅ Implementado | Proxy a workflow n8n con rate-limit durable |
| API pública (terceros) | ✅ Implementado | Cliente externo **desactivado**; pendiente de rotación de credenciales antes de reactivar |
| Panel admin + soporte chat | ✅ Implementado | En producción (acceso restringido por rol; ruta privada no documentada) |
| Colas de email y reintentos de webhooks | ✅ Implementado | Workers `process-email-queue`, `process-webhook-retries` |
| GDPR (export + borrado) | ✅ Implementado | `delete-account`, export en Settings |

> **Deuda técnica conocida:** el historial de migraciones está desincronizado (`supabase db push` no fiable); aplicar SQL nuevo desde el **SQL Editor** de Supabase, no a ciegas. Los ficheros root `lib/pdf.ts`, `lib/certificate.ts` y `lib/tsa.ts` son **utilidades huérfanas** (no forman parte del flujo vivo, que vive íntegramente en las Edge Functions); `lib/tsa.ts` está deprecado a propósito y lanza error si se invoca.

---

## 3. Contexto Legal

### 3.1 Marco Regulatorio

FirmaClara opera bajo el **Reglamento (UE) 910/2014 (eIDAS)**, que define tres niveles de firma:

| Nivel | Tipo | Validez | Carga de prueba | FirmaClara |
|---|---|---|---|---|
| 1 | Simple (SES) | ✅ Sí | Quien afirma debe probar | ✅ Aquí |
| 2 | Avanzada (AdES) | ✅ Sí | Depende del caso | ❌ |
| 3 | Cualificada (QES) | ✅ Plena | Quien niega debe probar | ❌ |

**Artículo 25.1 eIDAS:** "No se denegarán efectos jurídicos ni admisibilidad como prueba en procedimientos judiciales a una firma electrónica por el mero hecho de ser una firma electrónica."

FirmaClara produce **firma electrónica simple** reforzada con evidencias técnicas. Su validez no descansa en un certificado X.509 incrustado, sino en la **acumulación de evidencias verificables**.

### 3.2 Qué Aporta FirmaClara como Prueba

| Evidencia | Qué demuestra | Peso probatorio |
|---|---|---|
| Hash SHA-256 del PDF firmado | Documento no modificado tras la firma | Alto |
| Sellado de tiempo RFC 3161 (TSA tercera) | El documento existía en un instante exacto | Alto |
| Verificación OTP (SMS/WhatsApp/email) | Control del canal de contacto del firmante | Alto |
| IP del firmante (de headers de confianza) | Origen de la conexión de firma | Medio |
| User-agent (de headers de confianza) | Dispositivo/navegador usado | Medio |
| Timestamp de servidor por evento | Cronología de la operación | Medio |
| Firma manuscrita digital (canvas) | Intención de firmar | Medio |
| Traza de auditoría (event_logs) | Secuencia completa: creado→enviado→visto→firmado | Alto |

> **Decisión de seguridad clave:** la IP y el user-agent se capturan de **headers de confianza del servidor** (`x-real-ip`, `user-agent`), nunca del cuerpo de la petición que controla el cliente. Antes el user-agent venía del JSON → falsificable en el acta.

### 3.3 Sellado de Tiempo — Multi-proveedor con Failover

A diferencia del PRD v1.0 (FreeTSA único), el sellado usa **4 autoridades RFC 3161 con failover en cascada**:

`Apple → DigiCert → FreeTSA → Sectigo`

La función `request-tsa` construye una `TimeStampReq` DER real (`asn1js` + `pkijs`), con nonce aleatorio anti-replay y parámetros SHA-256 ausentes según RFC 5754, y **verifica criptográficamente** que el hash sellado por la TSA coincide con el enviado antes de aceptar el token. El token TSR (base64) se guarda en `signatures.tsa_response`.

### 3.4 Tipos de Documentos

**Adecuado para:** presupuestos y su aceptación, contratos de servicios, partes de trabajo/obra, NDAs básicos, autorizaciones (imagen, datos), colaboración comercial, mantenimiento, acuerdos de pago.

**NO adecuado para:** compraventa de inmuebles, hipotecas, contratos laborales complejos, Administración Pública, testamentos o documentos notariales.

### 3.5 Política de Retención

- **Duración:** 6 años (art. 30 Código de Comercio)
- **Limpieza de borradores:** rutina de limpieza de borradores antiguos (`cleanup_old_drafts`)
- **GDPR:** derecho de acceso/portabilidad (export JSON) y supresión (borrado en cascada) implementados

---

## 4. Arquitectura Técnica

### 4.1 Stack Tecnológico Real

| Capa | Tecnología | Función |
|---|---|---|
| Build/Frontend | Vite 7 + React 18 + TypeScript 5 | SPA, HMR, lazy-loading por ruta |
| Routing | React Router DOM 7 | Rutas públicas / autenticadas / admin |
| Estado servidor | TanStack React Query 5 | Caché y sincronización de datos |
| Formularios | React Hook Form 7 + Zod 4 | Validación tipada |
| UI | Tailwind 3 + shadcn/ui (Radix) + Lucide + Sonner | Componentes accesibles, toasts |
| i18n | i18next + react-i18next | 5 idiomas (es, en, ca, fr, pt) |
| PDF cliente | pdfjs-dist | Visor y previsualización |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno) | Datos, auth, ficheros, lógica |
| Manipulación PDF | pdf-lib (server, Deno) | Estampado de firma + certificado |
| Sellado tiempo | asn1js + pkijs (RFC 3161) | TimeStampReq/Resp DER reales |
| Pagos | Stripe 14 (Checkout, Customer Portal, Webhooks) | Suscripciones, packs, overage |
| Conversión Office | Gotenberg (LibreOffice, self-hosted en VPS) | Office/ODF/RTF/TXT/CSV → PDF |
| Automatización/Email | n8n + Resend | Emails transaccionales, Clara |
| SMS/WhatsApp | Twilio | OTP por SMS/WhatsApp |
| IA | Google Gemini (vía workflow n8n) | Asistente Clara |
| Observabilidad | Sentry | Captura de errores frontend |
| Testing | Vitest + Testing Library + Playwright | Unit, integración, e2e |
| Hosting | Vercel (frontend) + Supabase (backend) + VPS (Gotenberg) | Despliegue |

> **Cambio respecto a v1.0:** desaparecen "Lovable" (solo quedó `lovable-tagger` como dev-dependency de tagging) y "Antigravity API". La lógica de negocio vive en **Edge Functions de Supabase (Deno)**, no en un backend Antigravity. La autenticación es **propia de Supabase Auth** (email/password + Google), no delegada a Multicentros (la columna `multicentros_id` permanece como vestigio sin uso activo).

### 4.2 Diagrama de Arquitectura (actualizado)

```
┌──────────────────────────────────────────────────────────────────────┐
│                            FIRMACLARA                                  │
├──────────────────────────────────────────────────────────────────────┤
│  EMISOR ──▶ SPA React (Vite/Vercel)                                    │
│              │  Dashboard · Nuevo doc (wizard) · Plantillas ·          │
│              │  Contactos · Clara · Ajustes/Marca · Planes · Soporte   │
│              ▼                                                          │
│        Supabase Edge Functions (Deno) ── núcleo de lógica:             │
│          send-invite-v2 · sign-complete-v2 · request-tsa ·            │
│          generate-audit-trail · convert-to-pdf · send-otp ·          │
│          clara-chat · create-plan-checkout · stripe-webhook ·        │
│          signature-requests (API) · soporte/colas/crons               │
│              │              │               │            │             │
│              ▼              ▼               ▼            ▼             │
│        Supabase DB     Supabase        Servicios     n8n              │
│        (Postgres+RLS)  Storage         externos:     (emails,         │
│        + RPC billing   (PDFs,          Stripe,       Clara/Gemini)    │
│        consumir_firma  logos)          Twilio,                        │
│                                        Resend,                        │
│                                        TSA x4,                        │
│                                        Gotenberg(VPS)                 │
│                                                                        │
│  FIRMANTE ──▶ /sign/:token (público, sin registro)                    │
│                Visor PDF · OTP opcional · Canvas firma                 │
│                                                                        │
│  ADMIN ──▶ [ruta privada no documentada] · acceso por rol            │
│             Stats · Usuarios · Créditos · Logs · Soporte · Equipo     │
│                                                                        │
│  TERCEROS (API) ──▶ REST signature-requests + webhooks HMAC-SHA256    │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 Estructura de Rutas

```
Públicas:
  /                     Landing
  /login /register /update-password /account-confirmed
  /sign/:token          Firma pública (sin auth)
  /legal /terms /privacy /how-it-works /precios

Autenticadas (RequireAuth):
  /onboarding
  /dashboard            Panel principal
  /documents            Listado + filtros
  /documents/new        Wizard de creación/envío
  /documents/:id        Detalle + descargas
  /templates            Plantillas
  /contacts             Agenda
  /credits              Saldo + historial transacciones
  /settings             Perfil, marca, fiscal, GDPR
  /clara                Asistente IA
  /help                 Ayuda + soporte chat

Admin (AdminRoute, ruta privada — no documentada por seguridad):
  .../dashboard .../users .../credits .../support .../logs .../team
```

---

## 5. Modelo de Datos

> El `schema.sql` base ha sido extendido por **~70 migraciones**. A continuación, el modelo **efectivo** (tablas y columnas relevantes que existen tras aplicar las migraciones).

### 5.1 Tablas Principales

**users** (vinculada 1:1 a `auth.users`)
- Identidad: `id`, `email`, `name`, `company_name`, `phone`, `role` (`user`/`support`/`admin`)
- Fiscal: `legal_type` (individual/company), `tax_id`, `legal_address`, `billing_email`
- Onboarding/legal: `onboarding_completed`, `legal_accepted`, `legal_accepted_at`
- **Plan/suscripción:** `plan_id` (gratis/basico/profesional), `subscription_status` (active/past_due/canceled/trialing), `stripe_customer_id`, `stripe_subscription_id`, `plan_renewed_at`, `grace_until`
- **Saldo de firmas:** `firmas_usadas_mes`, `firmas_creditos` (pack no caducable)
- **Marca:** `brand_logo_url`, `brand_color`, `brand_sender_name`
- Vestigio: `multicentros_id` (sin uso activo)

**documents**
- Básico: `id`, `user_id`, `title`, `file_url`, `file_hash`, `original_format` (formato pre-conversión o NULL si era PDF nativo)
- Estado: `status` (draft/sent/viewed/signed/expired/cancelled), `sign_token` (UUID público)
- Firmante: `signer_name`, `signer_email`, `signer_phone`, `signer_tax_id`, `signer_address`
- Firma config: `signature_type` (checkbox_only/checkbox_name/full), `signature_page` (-1 última, 0 anexo, N página), `signature_x`, `signature_y`
- Seguridad OTP: `security_level` (standard/whatsapp_otp), `otp_code_hash` (`salt:hash`), `otp_expires_at`, `otp_failed_attempts`
- Plantilla/API: `is_template`, `api_client_id`
- Artefactos/tiempos: `signed_file_url` (ruta de storage), `certificate_url`, `sent_at`, `viewed_at`, `signed_at`, `cancelled_at`, `expires_at`

**signatures** — evidencias de la firma: `signer_name/email`, `ip_address`, `user_agent`, `hash_sha256`, `tsa_request`, `tsa_response`, `tsa_timestamp`, `signed_at`.

**event_logs** — traza de auditoría: `document_id`, `user_id`, `event_type`, `event_data` (JSONB), `ip_address`, `user_agent`, `created_at`.

### 5.2 Facturación y Créditos

**credit_transactions** — libro mayor de movimientos: `type` (purchase/usage/gift/refund/expiry), `amount` (±), `description`, `document_id`, `consumption_source` (`credito_pack`/`cuota_plan`/`overage`).

**overage_charges** — firmas extra del plan Profesional: `firma_id` (único), `amount_eur` (0,40 por defecto), `billed`, `stripe_invoice_item_id`, `mes_ciclo`.

**plan_history** — log inmutable de cambios de plan: `plan_anterior`, `plan_nuevo`, `motivo` (upgrade/downgrade/cancelacion/pago_fallido/admin/migracion), `stripe_event_id`.

**user_credit_purchases** / **credit_packs** — histórico del modelo antiguo (FIFO); **inerte** tras la migración a planes (se conserva para auditoría).

### 5.3 Operación y Soporte

- **contacts** — agenda del emisor: `name`, `email`, `phone`, `nif`, `address`.
- **support_chats** / **support_messages** — chat de soporte en vivo (Realtime), con `status`, `admin_read`/`user_read`, rating y comentario.
- **clara_conversations** / **clara_messages** — historial del asistente IA.
- **otp_logs** — auditoría y rate-limiting de OTP (`success`, `blocked`, `block_reason`); acceso solo service_role.
- **webhook_events** — idempotencia + reintentos de webhooks Stripe (`status`, `attempts`, `next_retry_at`).
- **email_queue** — cola de email con reintentos (`template_type`, `status`, backoff).
- **api_clients** — clientes API externos (terceros): `api_key_hash` (SHA-256), `webhook_url`, `webhook_secret` (HMAC), `user_id` (cuenta que paga los créditos), `active`.

### 5.4 Funciones RPC (núcleo de negocio)

| Función | Rol | Descripción |
|---|---|---|
| `consumir_firma(user, doc, desc)` | **Núcleo de consumo** | Orden: 1) crédito de pack → 2) cuota del plan → 3) overage (solo Profesional) → 4) bloqueo. Devuelve JSON con resultado/plan/límite. Lock de fila por usuario (serializa concurrencia). |
| `revertir_firma(...)` | service_role | Deshace el último consumo (reembolso por fallo de envío); anti-abuso 15 min. |
| `consume_credit` / `consume_credit_for_user` / `refund_credit` | Wrappers | Compatibilidad: delegan en el núcleo para no redeployar todo a la vez. |
| `add_firmas_creditos(...)` | service_role | Suma créditos de pack (idempotente por `stripe_session`). |
| `get_available_credits()` | authenticated | Saldo disponible = créditos de pack + cuota restante. |
| `get_plan_status()` | authenticated | Estado completo (plan, uso, overage acumulado, gracia) para dashboard/precios. |
| `reset_firmas_mensuales()` | cron | Resetea cuota **solo del plan gratis** (los de pago se resetean en su ciclo Stripe). |
| `firmas_limite_plan(plan)` | helper | Límite por plan (2/10/50). |
| `guard_user_update()` | trigger | Bloquea que un usuario modifique campos de facturación/rol salvo admin/service_role/contexto de facturación. |
| `is_admin()` / `is_support()` | helpers | Control de acceso por rol. |
| `grant_credits()` / `set_user_role()` | admin/soporte | Regalo de créditos y gestión de roles. |
| `get_admin_stats(period)` | admin | KPIs agregados (ingresos, growth, activos, firmados, top clientes, series temporales). |
| `mark_expired_documents()` / `mark_document_viewed()` | sistema | Expiración y marca de "visto". |

> **Decisión de arquitectura:** `consumir_firma()` es la **única fuente de verdad** del consumo. El saldo vive en `users.firmas_*`. Esto evita doble cobro y fuentes duplicadas cuando conviven envíos desde frontend, API y reembolsos.

---

### 5.5 Diccionario de Datos Completo (introspección en vivo)

> Inventario obtenido por **introspección directa de la base de datos de producción** (Supabase, PostgreSQL 17, junio 2026). Refleja el esquema **realmente desplegado** tras todas las migraciones, no el `schema.sql`. **23 tablas + 2 vistas**, agrupadas por dominio. La columna "Filas" es la estimación del planner (`—` = vacía o sin estadísticas).

#### 5.5.1 Inventario por dominio

| Dominio | Objeto | Filas | Para qué sirve |
|---|---|---|---|
| **Identidad** | `users` | 15 | Cuenta del emisor (1:1 con `auth.users`). Raíz de casi todas las FKs |
| | `contacts` | — | Agenda de firmantes del emisor |
| **Documentos y firma** | `documents` | 86 | Documentos enviados a firmar (núcleo del producto) |
| | `signatures` | — | Registro firme de cada firma (evidencias + TSA) |
| | `event_logs` | 170 | Traza de auditoría de cada documento |
| | `otp_logs` | — | Intentos de OTP (rate-limiting / anti-fuerza-bruta) |
| **Créditos y facturación** | `credit_packs` | — | Catálogo de packs (modelo actual) |
| | `pack_types` | — | Catálogo de packs (legacy, coexiste con `credit_packs`) |
| | `user_credit_purchases` | 18 | Compras de packs FIFO por usuario |
| | `credit_transactions` | 54 | Libro mayor de movimientos de crédito |
| | `overage_charges` | — | Cargos por firma extra (overage del plan Profesional) |
| | `plan_history` | — | Log de cambios de plan/suscripción |
| **Clara (IA) y conocimiento** | `clara_conversations` | — | Conversaciones con el asistente |
| | `clara_messages` | — | Mensajes de cada conversación |
| | `clara_usage_logs` | — | Uso de Clara por usuario (métricas/rate-limit) |
| | `knowledge_vectors` | — | Base de conocimiento vectorial (pgvector / RAG) |
| | `n8n_chat_histories` | — | Historial de chat del workflow n8n |
| **Soporte** | `support_chats` | 9 | Tickets/chats de soporte en vivo |
| | `support_messages` | 23 | Mensajes de cada chat |
| **Infra e integraciones** | `api_clients` | — | Clientes de la API pública (integración de terceros) |
| | `webhook_events` | — | Cola/idempotencia de webhooks (Stripe…) |
| | `email_queue` | — | Cola de emails transaccionales con reintentos |
| | `schema_change_logs` | — | Auditoría de cambios DDL (forensia) |
| **Vistas** | `documents_with_signatures` | (vista) | Join documento + firma para audit/UI |
| | `user_credits` | (vista) | Saldo agregado de créditos por usuario |

**Enum definido:** `security_level_enum` = `standard`, `whatsapp_otp`.

#### 5.5.2 Detalle de columnas por tabla

**`users`** — `id` (uuid PK), `multicentros_id`, `email`, `name`, `company_name`, `phone`, `onboarding_completed`, `legal_accepted`, `legal_accepted_at`, `role` (text, def. `user`), `tax_id`, `address`, `city`, `zip_code`, `country` (def. `España`), `issuer_type` (def. `company`), `legal_type` (def. `individual`), `legal_address`, `billing_email`, `plan_id` (text, def. `gratis`), `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` (def. `active`), `plan_renewed_at`, `firmas_usadas_mes` (def. 0), `firmas_creditos` (def. 0), `grace_until`, `created_at`, `updated_at`.

**`contacts`** — `id` (uuid PK), `user_id` → `users`, `email`, `name`, `phone`, `nif`, `address`, `created_at`.

**`documents`** — `id` (uuid PK), `user_id` → `users`, `title`, `file_url`, `file_hash`, `status` (def. `draft`), `signature_type` (def. `full`), `sign_token`, `signer_email`, `signer_name`, `signer_phone`, `custom_message`, `expires_at`, `sent_at`, `viewed_at`, `signed_at`, `cancelled_at`, `signed_file_url`, `certificate_url`, `signer_tax_id`, `signer_address`, `security_level` (enum, def. `standard`), `otp_code_hash`, `otp_expires_at`, `signature_page` (def. 0), `signature_x` (def. 0), `signature_y` (def. 0), `otp_failed_attempts` (def. 0), `api_client_id` → `api_clients`, `original_format`, `is_template` (def. false), `created_at`, `updated_at`.

**`signatures`** — `id` (uuid PK), `document_id` → `documents`, `signer_name`, `signer_email`, `ip_address` (inet), `user_agent`, `acceptance_text` (def. "He leído y acepto…"), `signature_image_url`, `hash_sha256`, `tsa_request` (bytea), `tsa_response` (bytea), `tsa_timestamp`, `signed_at`, `created_at`, `otp_channel`, `otp_verified_at`, `otp_code_ref`.

**`event_logs`** — `id` (uuid PK), `document_id` → `documents`, `user_id` → `users`, `event_type`, `event_data` (jsonb, def. `{}`), `ip_address` (inet), `user_agent`, `created_at`.

**`otp_logs`** — `id` (uuid PK), `document_id` → `documents`, `ip_address` (inet), `user_agent`, `success` (def. false), `blocked` (def. false), `block_reason`, `created_at`.

**`credit_packs`** — `id` (uuid PK), `slug`, `name`, `credits` (int), `price` (int, céntimos), `description`, `popular` (def. false), `is_active` (def. true), `created_at`, `updated_at`.

**`pack_types`** — `type` (varchar PK), `name`, `credits` (int), `price` (numeric), `price_per_credit` (numeric), `stripe_price_id`.

**`user_credit_purchases`** — `id` (uuid PK), `user_id` → `users`, `pack_type`, `credits_total` (int), `credits_used` (def. 0), `price_paid` (numeric, def. 0), `stripe_payment_id`, `stripe_session_id`, `purchased_at`, `expires_at`, `created_at`, `updated_at`.

**`credit_transactions`** — `id` (uuid PK), `user_id` → `users`, `type`, `amount` (int, ±), `description`, `document_id` → `documents`, `credit_pack_id`, `consumption_source`, `created_at`. *(Tiene comentario en BD: "Stores credit transaction history for users".)*

**`overage_charges`** — `id` (uuid PK), `user_id` → `users`, `firma_id` → `documents`, `charged_at`, `amount_eur` (numeric, def. 0.40), `stripe_invoice_item_id`, `billed` (def. false), `mes_ciclo` (date).

**`plan_history`** — `id` (uuid PK), `user_id` → `users`, `plan_anterior`, `plan_nuevo`, `motivo`, `changed_at`, `stripe_event_id`.

**`clara_conversations`** — `id` (uuid PK), `user_id` → `users`, `status` (def. `active`), `generated_document_id` → `documents`, `created_at`, `updated_at`.

**`clara_messages`** — `id` (uuid PK), `conversation_id` → `clara_conversations`, `role`, `content`, `tokens_used` (int), `created_at`.

**`clara_usage_logs`** — `id` (bigint PK), `user_id` (uuid), `created_at`.

**`knowledge_vectors`** — `id` (bigint PK), `content`, `metadata` (jsonb), `embedding` (`vector`, pgvector).

**`n8n_chat_histories`** — `id` (int PK), `session_id`, `message` (jsonb).

**`support_chats`** — `id` (uuid PK), `user_id` (uuid), `user_email`, `subject`, `status` (def. `open`), `created_at`, `updated_at`, `last_message_at`, `admin_read` (def. false), `user_read` (def. true), `rating` (smallint), `closed_by`, `rating_comment`.

**`support_messages`** — `id` (uuid PK), `chat_id` → `support_chats`, `sender`, `content`, `created_at`.

**`api_clients`** — `id` (uuid PK), `name`, `api_key_hash`, `webhook_url`, `webhook_secret`, `active` (def. true), `created_at`, `last_used_at`, `user_id` → `users`.

**`webhook_events`** — `id` (uuid PK), `event_id`, `event_type`, `payload` (jsonb), `status` (def. `pending`), `attempts` (def. 0), `last_attempt_at`, `next_retry_at`, `error_message`, `processed_at`, `created_at`.

**`email_queue`** — `id` (uuid PK), `template_type`, `to_email`, `to_name`, `subject`, `html_body`, `metadata` (jsonb, def. `{}`), `status` (def. `pending`), `attempts` (def. 0), `last_attempt_at`, `next_retry_at` (def. now()), `error_message`, `sent_at`, `created_at`.

**`schema_change_logs`** — `id` (uuid PK), `event_time`, `command_tag`, `object_identity`, `schema_name`, `user_name`.

**Vista `documents_with_signatures`** — proyecta `documents` + datos de su firma: `id`, `user_id`, `title`, `status`, `file_url`, `signed_file_url`, `certificate_url`, `signer_name/email/phone`, `sign_token`, `signature_type`, `security_level`, `expires_at`, `sent_at`, `signed_at`, `created_at`, `updated_at`, `signer_ip` (inet), `signer_user_agent`, `signature_hash`, `tsa_timestamp`.

**Vista `user_credits`** — `user_id`, `available_credits` (bigint), `total_packs` (bigint).

#### 5.5.3 Mapa de relaciones (claves foráneas reales)

```
users (raíz)
 ├─< contacts (user_id)
 ├─< documents (user_id) ───────────┐
 │     ├─< signatures (document_id)  │
 │     ├─< event_logs (document_id)  │
 │     ├─< otp_logs (document_id)    │
 │     ├─< credit_transactions (document_id)
 │     ├─< overage_charges (firma_id)
 │     └─< clara_conversations (generated_document_id)
 ├─< api_clients (user_id) ──< documents (api_client_id)   ← integración API externa
 ├─< credit_transactions (user_id)
 ├─< user_credit_purchases (user_id)
 ├─< overage_charges (user_id)
 ├─< plan_history (user_id)
 ├─< event_logs (user_id)
 └─< clara_conversations (user_id) ──< clara_messages (conversation_id)

support_chats ──< support_messages (chat_id)
```

**Relación lógica por `user_id` pero SIN FK declarada** (no hay borrado en cascada físico): `clara_usage_logs`, `webhook_events`, `email_queue`, `knowledge_vectors`, `n8n_chat_histories`, `schema_change_logs`, `pack_types`, `credit_packs`.

> **Matiz importante:** además de las 17 FKs hacia `public.*` del diagrama, existen FKs hacia el esquema `auth`. En concreto, **`support_chats.user_id` → `auth.users(id)` con `ON DELETE CASCADE`** (verificado), por lo que el borrado de cuenta sí cascadea sobre chats y, vía `support_messages → support_chats`, también sobre sus mensajes. (La primera pasada de introspección, que solo listaba constraints hacia `public`, no mostró esta FK.)

#### 5.5.4 Discrepancias detectadas (BD real vs. §5.1–5.4)

> Hallazgos de la introspección que conviene resolver para que el PRD y la BD queden 100 % alineados:

1. **(Resuelto 18/06) Columnas de marca:** §5.1 lista `brand_logo_url`, `brand_color`, `brand_sender_name` en `users`. La introspección inicial confirmó que **no existían** (migración `20260612_brand_settings.sql` sin aplicar). **Ya corregido:** la migración se aplicó a producción y las columnas + el bucket `brand-logos` existen y están verificados (ver §12 C-1).
2. **Doble catálogo de packs activo:** conviven `credit_packs` (nuevo) y `pack_types` (legacy). §5.2 marca el modelo de packs como "inerte", pero ambas tablas de catálogo siguen presentes; falta decidir fuente de verdad única.
3. **Dos modelos de monetización superpuestos en BD:** el de créditos (`user_credit_purchases` + `credit_transactions`, con 18 y 54 filas) y el de planes+overage (`users.plan_id` / `firmas_usadas_mes` / `overage_charges`). Coherente con el estado "pendiente de despliegue completo" (§2), pero la BD soporta ambos a la vez.
4. **(Corregido) `support_chats` y el borrado GDPR:** una verificación directa confirmó que `support_chats.user_id` **sí tiene FK** → `auth.users(id)` con `ON DELETE CASCADE`; el borrado de cuenta cascadea correctamente. La aparente "ausencia de FK" fue un artefacto de la primera introspección (solo miraba `public`).
5. **Tablas no documentadas en §5 hasta ahora:** `clara_usage_logs`, `knowledge_vectors` (pgvector/RAG), `n8n_chat_histories`, `schema_change_logs` y las vistas `documents_with_signatures` / `user_credits` no aparecían en la versión narrativa; quedan recogidas aquí.

---

## 6. Catálogo de Edge Functions (Deno)

| Función | Propósito |
|---|---|
| `send-invite-v2` | **Envío + cobro server-side atómico** (consume firma vía `consumir_firma`), branding, email vía n8n con fallback Resend, reembolso si falla |
| `sign-complete-v2` | **Finaliza la firma**: descarga PDF, valida OTP, estampa firma posicionada, calcula hash, sube PDF firmado, control de concurrencia optimista, dispara acta + notificación |
| `request-tsa` | Sellado RFC 3161 con failover Apple→DigiCert→FreeTSA→Sectigo y verificación de hash |
| `generate-audit-trail` | Genera el **Certificado de Evidencia Electrónica** (PDF) y solicita la TSA |
| `convert-to-pdf` | Conversión Office/ODF/RTF/TXT/CSV → PDF vía Gotenberg (auth + validación MIME/extensión, 10 MB) |
| `send-otp` | OTP multicanal (SMS/WhatsApp vía Twilio, email vía Resend) con rate-limiting multinivel y fallback |
| `clara-chat` | Proxy autenticado al workflow n8n de Clara con rate-limit durable en DB |
| `create-plan-checkout` | Crea sesión de Stripe Checkout (suscripción o pack); exige consentimiento de overage en Profesional |
| `create-checkout-session` | Checkout del modelo de packs (legado) |
| `stripe-webhook` | Ciclo de vida de suscripción + facturación de overage + idempotencia (`webhook_events`) |
| `stripe-portal` | Abre el Customer Portal de Stripe (gestión/cancelación) |
| `signature-requests` | **API pública REST** para terceros (crear/consultar solicitudes); consume crédito de la cuenta vinculada |
| `send-signed-notification` | Notifica al emisor (email/SMS) que el documento fue firmado |
| `send-document-invitation` | Invitación de firma (versión previa a v2) |
| `send-reminders` | Recordatorios de documentos pendientes (cron) |
| `send-welcome-email` | Email de bienvenida |
| `send-daily-metrics` | Email diario de métricas (admin) |
| `process-email-queue` | Worker de la cola de email con reintentos (cron) |
| `process-webhook-retries` | Worker de reintentos de webhooks fallidos (cron) |
| `support-chat` / `contact-support` | Soporte: chat en vivo y formulario de contacto |
| `get-credits` / `get-file-for-signing` | Saldo de créditos / entrega controlada del PDF al firmante |
| `delete-account` | GDPR Art. 17: borrado en cascada de la cuenta |
| `_shared/*` | CORS, `n8n.ts`, `emailQueue.ts`, `webhook-dispatch.ts` (HMAC + validación API key) |

**CORS:** todas las funciones usan whitelist de orígenes (sin wildcard `*`): los dominios de producción (con y sin `www`) y los `localhost` de desarrollo. Orígenes no permitidos reciben `Access-Control-Allow-Origin: null`. Helpers compartidos en `_shared/cors.ts` (`getCorsHeaders`, `handleCorsPreflightRequest`, `escapeHtml`, `sanitizeErrorMessage`).

---

## 7. Funcionalidades

### 7.1 Autenticación y Onboarding

- **Auth propia** (Supabase Auth): registro email/password (mín. 12 caracteres, mayúscula, minúscula y número) y Google OAuth.
- Trigger `handle_new_user`: crea el perfil en `public.users` con `plan_id = 'gratis'` (2 firmas/mes). (En el modelo antiguo asignaba 2 créditos de pack `trial`.)
- Onboarding: bienvenida, explicación de validez legal, aceptación de términos obligatoria, datos de emisor (tipo legal, NIF, dirección).

### 7.2 Dashboard

- Badge de saldo/cuota disponible (RPC `get_available_credits` / `get_plan_status`).
- Accesos: "Nuevo documento", "Hablar con Clara".
- Listado de documentos con estados, filtros y buscador.
- Estados: borrador, enviado, visto, firmado, expirado, cancelado.

### 7.3 Creación y Envío de Documento (wizard de 5 pasos)

`Tipo → Documento → Firmante → Opciones → Revisión`

1. **Tipo:** presupuesto / parte de trabajo / contrato / otro (los presupuestos relajan la obligatoriedad de NIF y dirección).
2. **Documento:** subida por click o drag&drop. PDF directo; **Office/ODF/RTF/TXT/CSV se convierten automáticamente a PDF** (Gotenberg), conservando el `original_format` como evidencia. Previsualización con pdf.js. Máx 10 MB.
3. **Firmante:** nombre/razón social, email (con autocompletado desde la agenda), NIF (validación checksum MOD-23), dirección, y **toggle de seguridad extra (OTP por SMS)** que pide el móvil.
4. **Opciones:** **colocación visual de la firma** (picker que arrastra el recuadro "✍ Firma aquí" sobre el PDF; por defecto, abajo en la última página), mensaje personalizado, plazo (3/7/15/30 días).
5. **Revisión:** resumen + aviso de consumo (1 firma, o aviso de **cargo extra 0,40 €** si Profesional ha superado su cuota) y envío.

Extras: **borradores** (reanudar por `draftId`), **plantillas** (prerrellenar desde `templateId`), y oferta no bloqueante de **guardar el firmante en la agenda** tras enviar.

> **Cobro:** el consumo de firma y la transición a `sent` ocurren **server-side dentro de `send-invite-v2`**, de forma atómica con el envío. El cliente ya no puede enviar saltándose el cobro (antes era trivial desde la consola). Si el envío de email falla, el crédito se reembolsa automáticamente (vía service_role).

### 7.4 Plantillas

Un documento con `is_template = true` no se envía: sirve para crear documentos nuevos reutilizando su archivo y datos. Excluidas de los listados normales. El archivo original es inmutable, por lo que referenciar el mismo `file_url` no produce modificación cruzada.

### 7.5 Agenda de Contactos

CRUD de contactos del emisor (`name`, `email`, `phone`, `nif`, `address`) con RLS por usuario. Integrada en el wizard (selector e email-autocomplete) y con guardado automático ofrecido tras cada envío.

### 7.6 Experiencia del Firmante (`/sign/:token`)

1. Llega por email (con branding del emisor si está configurado).
2. Visor del PDF integrado (renderizado a canvas).
3. Si `security_level = whatsapp_otp`: solicita y verifica **código OTP** (SMS/WhatsApp/email).
4. Dibuja su firma sobre un `<canvas>` (resolución ajustada por `devicePixelRatio`).
5. Confirma → la firma se exporta a **PNG base64** y se envía a `sign-complete-v2`.
6. Pantalla de confirmación.

**OTP — seguridad (`send-otp` + `sign-complete-v2`):**
- Código de 6 dígitos criptográficamente seguro, **hash `salt:hash` SHA-256**, expiración 15 min.
- Canal automático: SMS/WhatsApp si hay teléfono; email si no. **Fallback a email** si Twilio falla.
- Comparación **timing-safe** y **lockout tras 5 intentos** fallidos.
- **Rate-limiting multinivel** en `otp_logs`: por documento (5/10 min), por IP (15/10 min), global (100/h) y por email del firmante (5/h).

### 7.7 Proceso Técnico de Firma (`sign-complete-v2`)

1. Valida token (UUID), firma (PNG base64, límite ~6 MB) y estado del documento (no firmado, no expirado).
2. Verifica OTP si aplica.
3. Descarga el PDF original (validación de esquema URL anti-SSRF).
4. Estampa el PNG escalado a caja 200×80 pt en la página/coordenadas configuradas; sanea texto a WinAnsi (evita crash por emojis).
5. Calcula **SHA-256** del PDF firmado.
6. Sube el PDF firmado a Storage (`{user_id}/{doc_id}_signed.pdf`).
7. Marca `status='signed'` con **control de concurrencia optimista** (`.neq('status','signed')` + `count`), evitando dobles firmas concurrentes.
8. Inserta el registro en `signatures` (IP/UA de headers de confianza, hash).
9. Dispara `generate-audit-trail` (acta + TSA) y `send-signed-notification`.
10. Registra evento `document.signed`.

### 7.8 Post-Firma

**PDF firmado:** original + firma estampada (con metadatos de firmante/fecha) o página-anexo si así se configuró.

**Certificado de Evidencia Electrónica** (`generate-audit-trail`, PDF separado): info del documento (incluye formato original si hubo conversión), participantes, evidencia técnica (fecha servidor, IP, user-agent), **sellado de tiempo TSA** (autoridad, timestamp, referencia al TSR en BD), verificación OTP si aplica, y **traza de auditoría completa**. Guardado en `documents.certificate_url`.

### 7.9 Asistente Clara (IA)

- Frontend `/clara` → Edge `clara-chat` (**proxy autenticado a un workflow de n8n**, que ejecuta el modelo Gemini). No llama a Gemini directamente desde la función.
- **Rate-limit durable en DB** (RPC `check_clara_rate_limit`, ~20 req/min/usuario; fail-open para no tumbar el chat ante un hipo de DB).
- Validación de entrada: máx 50 mensajes de historial, 10 000 caracteres/mensaje, verificación de propiedad si se referencia un `documentId`.
- Capacidades de producto: generación y revisión de contratos, explicación de cláusulas, con disclaimers legales obligatorios (no sustituye asesoría profesional; rechaza inmuebles/hipotecas/laboral/AAPP/testamentos).

### 7.10 Personalización de Marca

En Ajustes (`BrandSettings.tsx`): logo (bucket público `brand-logos`, escritura restringida a la carpeta `{uid}/`, máx 2 MB, PNG/SVG/JPG), color hex (def. `#2563eb`) y nombre de remitente. Se aplican al email de invitación: `"[Empresa] vía FirmaClara"`, logo en cabecera y botón con el color de marca (lógica en `send-invite-v2`).

> ✅ **Estado (resuelto el 18/06/2026):** la migración `20260612_brand_settings.sql` se aplicó a producción. Verificado: existen las columnas `brand_logo_url` / `brand_color` / `brand_sender_name` en `users`, el bucket público `brand-logos` y sus 4 políticas de Storage (lectura pública + escritura/borrado restringidos a la carpeta `{uid}/`). La pantalla de marca y el branding en emails quedan operativos. Antes de esta corrección la feature estaba codificada pero rota en producción (ver §12 C-1).

### 7.11 Soporte en Vivo

Chat usuario↔admin con **Supabase Realtime** (`support_chats`/`support_messages`), estados open/closed, indicadores de leído, y valoración con comentario. Roles `support`/`admin` (helper `is_support()`). Formulario de contacto y sondeo de chat optimizado (solo con panel abierto).

### 7.12 Panel de Administración

Ruta **privada no documentada** (seguridad por ofuscación) con **pantalla de acceso enmascarada** (no aparenta ser un panel de administración) que verifica el rol antes de navegar (un usuario normal nunca alcanza el layout admin). El control real de acceso es el rol en BD + RLS; la ofuscación es una capa adicional, no el control principal:
- **Dashboard:** KPIs vía `get_admin_stats` (ingresos, growth, activos, firmados, top clientes, series, charts con Recharts).
- **Usuarios:** gestión y KYC.
- **Créditos:** regalo de créditos (`grant_credits`).
- **Logs:** auditoría de eventos.
- **Soporte:** bandeja de chats.
- **Equipo:** gestión de roles (`set_user_role`).

### 7.13 API Pública para Terceros

REST autenticada por **API key** (`Authorization: Bearer`, validada por hash SHA-256 en `api_clients`):
- `POST /signature-requests` → crea solicitud (documento bajo la cuenta vinculada, consume 1 crédito de esa cuenta, devuelve `signature_request_id` y `signing_url`). Rollback del documento si falla el cobro.
- `GET /signature-requests/:id` → estado de la solicitud (con URL firmada temporal del PDF si está firmado); **ownership** estricto por `api_client_id`.
- **Webhooks salientes firmados** (`dispatchWebhook`): al firmarse, POST con `X-FirmaClara-Signature` (HMAC-SHA256 hex del cuerpo) y `X-FirmaClara-Event` a `webhook_url` de cada cliente activo.

> El cliente API externo está **desactivado** a la espera de rotación de credenciales antes de reactivarlo. Las API keys se siembran/rotan mediante script administrativo dedicado, **nunca con secretos embebidos en migraciones**.

### 7.14 GDPR

- **Art. 20 (Portabilidad):** export de todos los datos del usuario en JSON desde Ajustes.
- **Art. 17 (Supresión):** borrado en cascada de la cuenta (`delete-account`), con confirmación escribiendo "ELIMINAR".
- **Cookie consent:** banner con categorías (necesarias/analytics/marketing) en localStorage.

---

## 8. Modelo de Precios y Facturación

### 8.1 Planes

| Plan | `plan_id` | Precio | Firmas/mes | Overage | Notas |
|---|---|---|---|---|---|
| Gratis | `gratis` | 0 € | 2 | No | Permanente, sin tarjeta |
| Básico | `basico` | 9 €/mes | 10 | No | Bloqueo al límite |
| Profesional | `profesional` | 19 €/mes | 50 | **0,40 €/firma** | Requiere aceptar overage; incluye marca y soporte prioritario |
| Pack puntual | `pack_puntual` | 15 € (único) | +15 (no caducan) | — | Se suma a cualquier plan; se consume **antes** que la cuota |

### 8.2 Orden de Consumo de una Firma (`consumir_firma`)

1. **Crédito de pack** (`firmas_creditos`), si hay.
2. **Cuota del plan** (`firmas_usadas_mes < límite`).
3. **Overage** (solo Profesional al corriente de pago) → registra cargo en `overage_charges`.
4. **Bloqueo** (Gratis/Básico sin crédito de pack) → HTTP 402 con `plan` y `limite` para mostrar modal de upgrade.

### 8.3 Ciclo de Vida con Stripe (`stripe-webhook`)

- `checkout.session.completed`: activa suscripción (resetea cuota) o suma el pack (idempotente por sesión).
- `customer.subscription.updated`: upgrade/downgrade desde el Portal; respeta `cancel_at_period_end`.
- `customer.subscription.deleted`: baja a Gratis.
- `invoice.payment_succeeded`: en renovación de ciclo resetea la cuota y **factura el overage pendiente** (invoice item por lote, con reclamación previa `billed=true` para evitar doble cargo).
- `invoice.payment_failed`: marca `past_due` con **periodo de gracia de 3 días**; pasado el plazo, el usuario consume como Gratis sin mutar su `plan_id` (al pagar recupera el plan automáticamente).
- Idempotencia y reintentos con backoff exponencial vía `webhook_events` (+ worker `process-webhook-retries`).

### 8.4 Reset de Cuota

`reset_firmas_mensuales()` (cron) resetea **solo el plan Gratis**. Los planes de pago se resetean en `invoice.payment_succeeded` (su ciclo real de Stripe), para no regalar cuota a mitad de ciclo.

---

## 9. Seguridad

### 9.1 Autenticación y Autorización
- Supabase Auth (JWT). Contraseñas: 12+ caracteres, mayúscula/minúscula/número.
- **RLS** habilitado en todas las tablas; políticas por `auth.uid()` y por rol (`is_admin`/`is_support`).
- `guard_user_update`: impide auto-asignarse plan/créditos/rol salvo admin, service_role o contexto de facturación.

### 9.2 Firma e Integridad
- Hash **SHA-256** del PDF firmado; **TSA RFC 3161** con verificación criptográfica del hash y failover de 4 proveedores.
- IP/User-agent desde **headers de confianza** (no del body).
- **Control de concurrencia optimista** para evitar doble firma.
- Validación anti-SSRF del esquema de URL del documento.

### 9.3 OTP
- Hash con salt, comparación timing-safe, lockout a 5 intentos, rate-limiting multinivel, OTP no logueado.

### 9.4 API y Webhooks
- API key por hash SHA-256; ownership por `api_client_id`; webhooks salientes firmados HMAC-SHA256.
- Secretos fuera de migraciones; rotación documentada.

### 9.5 Endurecimiento aplicado (2026)
- CORS sin wildcard en todas las funciones.
- Escapado HTML en plantillas de email (anti-XSS).
- Sanitización de mensajes de error (sin stack traces al cliente).
- `search_path` fijado en funciones SECURITY DEFINER; políticas RLS reforzadas; `security_invoker` en vistas.
- Colas con reintentos (email/webhooks) para fiabilidad.
- ErrorBoundary en React; Sentry para captura de errores.

---

## 10. Integraciones Externas

| Servicio | Uso | Variables/Notas |
|---|---|---|
| **Stripe** | Suscripciones, packs, overage, Portal | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASICO/PROFESIONAL/PACK` |
| **Resend** | Email transaccional (invitación, notificación, OTP) | clave en gestor de secretos; remitente `noreply@` del dominio propio |
| **Twilio** | OTP por SMS/WhatsApp | `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER` |
| **n8n** | Orquestación de emails y workflow de Clara | `N8N_WEBHOOK_URL` |
| **Gemini** | Modelo de IA de Clara (a través de n8n) | — |
| **Gotenberg** | Conversión Office→PDF (LibreOffice, self-hosted VPS) | `GOTENBERG_URL`, `GOTENBERG_TOKEN` |
| **TSA x4** | Sellado de tiempo RFC 3161 | Apple, DigiCert, FreeTSA, Sectigo |
| **API externa (terceros)** | Cliente API externo (firma como servicio) | `api_clients` (desactivado; pendiente rotación de credenciales) |

---

## 11. Inventario Completo del Código

> Mapa exacto del repositorio auditado (junio 2026). Conteos reales: **37 archivos de páginas**, **86 archivos de componentes**, **25 Edge Functions** (+ utilidades `_shared`), **66 migraciones SQL**, **28 scripts**. TypeScript con *strict mode relajado* (`noImplicitAny: false`, `strictNullChecks: false`).

### 11.1 Páginas (`src/pages/`, 37 archivos)

**Públicas / marketing:** `Index.tsx` (landing), `Precios.tsx`, `HowItWorks.tsx`, `Legal.tsx`, `Terms.tsx`, `Privacy.tsx`, `NotFound.tsx`.
**Autenticación (`auth/`):** `Login.tsx`, `Register.tsx`, `UpdatePassword.tsx`, `AccountConfirmed.tsx`.
**App autenticada:** `Dashboard.tsx`, `Documents.tsx`, `DocumentDetail.tsx`, `NewDocument.tsx` (wizard), `Templates.tsx`, `Contacts.tsx`, `Credits.tsx`, `CreditsPurchase.tsx` (legacy, ruta redirige a `/precios`), `Settings.tsx`, `Help.tsx`, `Clara.tsx`, `Onboarding.tsx`.
**Firma pública:** `SignDocument.tsx`.
**Admin (`admin/`):** `AdminDashboard.tsx`, `UsersManager.tsx`, `CreditsManager.tsx`, `AdminLogs.tsx`, `AdminSupportChats.tsx`, `AdminTeam.tsx`, `StealthLogin.tsx` (pantalla de acceso enmascarada).
**Tests (`__tests__/`):** `Contacts`, `Credits`, `Dashboard`, `Documents`, `SignDocument`, `auth/Register` (6 suites de página).

> **Hallazgo:** `CreditsPurchase.tsx` sigue en el repo aunque su ruta `/credits/purchase` ya solo hace `Navigate` a `/precios` (residuo del modelo de packs). Ver §12 (A-4).

### 11.2 Componentes (`src/components/`, 86 archivos)

**Raíz:** `ClaraChat`, `SupportChat`, `CookieConsent`, `ErrorBoundary`, `LegalModals`, `NavLink`, `SolutionsModal`, `ContactSalesDialog`.
**`layout/`:** `RequireAuth`, `AdminRoute`, `AuthenticatedLayout`, `PublicLayout`, `AdminLayout`, `Header`, `Footer`, `Sidebar`, `AdminSidebar`, `MobileMenu`, `BottomNavigation`.
**`auth/`:** `AuthLayout`. **`brand/`:** `BrandHeader`, `Logo`. **`contacts/`:** `ContactSelector`, `ContactEmailAutocomplete`.
**`dashboard/`:** `WelcomeBanner`. **`documents/`:** `PdfPreviewDialog`, `SignaturePositionPicker`. **`pdf/`:** `PdfViewer`, `PdfModal`.
**`plan/`:** `PlanUsageCard`, `OverageBanner`, `LimitReachedModal`. **`settings/`:** `BrandSettings`. **`onboarding/`:** `ProfileForm`.
**`shared/`:** `CreditsBadge`, `StatusBadge`. **`ui/`:** ~49 primitivas shadcn/ui (Radix).

### 11.3 Edge Functions (`supabase/functions/`, 25 funciones — catálogo completo en §6)

Funciones **vivas** (núcleo): `send-invite-v2`, `sign-complete-v2`, `request-tsa`, `generate-audit-trail`, `convert-to-pdf`, `send-otp`, `clara-chat`, `create-plan-checkout`, `stripe-webhook`, `stripe-portal`, `signature-requests`, `send-signed-notification`, `send-reminders`, `send-welcome-email`, `send-daily-metrics`, `process-email-queue`, `process-webhook-retries`, `support-chat`, `contact-support`, `get-credits`, `get-file-for-signing`, `delete-account`.

Funciones **legacy aún presentes** (no retiradas): `sign-complete` (sustituida por `sign-complete-v2`), `create-checkout-session` (sustituida por `create-plan-checkout`), `send-document-invitation` (sustituida por `send-invite-v2`). Ver §12 (A-4).

**`_shared/`:** `cors.ts`, `n8n.ts`, `emailQueue.ts`, `webhook-dispatch.ts`, `types.ts`.

### 11.4 Librería de aplicación

**Cliente (`src/lib/`, 14 archivos):** `supabase.ts`, `billing.ts` (checkout/portal), `stripe.ts`, `constants.ts` (`WELCOME_CREDITS=2`, `LOW_CREDITS_THRESHOLD=5`), `validators.ts` (NIF/NIE/CIF MOD-23, email, teléfono, password), `documentFormats.ts` (formatos Office aceptados), `i18n.ts`, `queryKeys.ts`, `download.ts`, `audio.ts`, `adminLogger.ts`, `withTimeout.ts`, `utils.ts` (`cn`), `integrations/supabase/` (client + types autogenerados).
**Raíz (`lib/`, 6 archivos — utilidades huérfanas):** `pdf.ts`, `certificate.ts`, `tsa.ts` (deprecado, lanza error si se invoca), `credits.ts`, `crypto.ts`, `supabase.ts`. **No forman parte del flujo vivo** (que vive íntegramente en las Edge Functions). Ver §12 (M-2).

### 11.5 Base de datos y operaciones

- **`supabase/migrations/` (66):** del `schema.sql` base + ~65 migraciones incrementales (seguridad, billing, OTP, soporte, marca, plantillas, integración de terceros…). Historial **desincronizado** (ver §12 A-3).
- **`scripts/` (28):** `db/` (setup, hotfixes, crons, RLS, API client), `stripe/` (`setup_products.mjs`, `configure_stripe.mjs`), despliegue (`deploy_functions.ps1`, `setup_secrets.ps1`), verificación (`check-production.js`, `verify_rls.js`), utilidades.
- **Buckets de Storage reales (verificado en prod):** `documents`, `signatures` y `brand-logos` (este último creado el 18/06/2026 al resolver §12 C-1).
- **Extensiones activas:** `pgvector` (embeddings de Clara, tabla `knowledge_vectors` + RPC `match_knowledge`), `pg_trgm` (búsqueda por similitud).

### 11.6 Configuración y calidad

- **Build:** `vite.config.ts`, `tsconfig.*` (3 archivos), `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `components.json` (shadcn).
- **Seguridad de cabeceras (`vercel.json`):** CSP estricta (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS con `preload`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva (cámara/micro/geo deshabilitados, `payment=(self)`). `Cache-Control: no-store` en `/sign/*`. CSP permite Stripe y analítica (Clarity); mantiene `'unsafe-inline'` solo en `style-src`.
- **Testing:** Vitest + Testing Library (unit/integración), Playwright (`e2e/`, 9 suites), `@vitest/coverage-v8`.
- **Observabilidad:** Sentry (`@sentry/react`), Vercel Analytics.
- **Documentos de auditoría en repo:** `FIRMACLARA_PRODUCTION_AUDIT.md`, `AUDITORIA_LANZAMIENTO_2026-06-09.md`, `LISTO_PARA_LANZAR.md`, `CHANGELOG.md`.

---

## 12. Auditoría Crítica: Deuda Técnica, Inconsistencias y Riesgos

> Esta sección es deliberadamente **crítica y honesta**. Recoge lo que está construido pero **mal alineado, duplicado, sin desplegar o frágil**. Severidad: 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🔵 Bajo. Los hallazgos marcados *(verificado)* se confirmaron por introspección directa de la base de datos de producción.

### 12.1 Hallazgos

**✅ C-1 · Personalización de marca (ME-03) — RESUELTO (18/06/2026)** *(verificado)*
**Hallazgo original:** la UI (`BrandSettings.tsx`) y `send-invite-v2` leían/escribían `users.brand_logo_url|brand_color|brand_sender_name` y el bucket `brand-logos`, pero **ninguno existía en producción** (la migración `20260612_brand_settings.sql` estaba en el repo sin aplicar). La pantalla de marca fallaba (columna inexistente → error de consulta) y los emails nunca aplicaban branding. **Corrección aplicada:** se ejecutó la migración contra producción; verificadas las 3 columnas, el bucket público `brand-logos` y sus 4 políticas de Storage. Sin acción pendiente. *(Causa raíz: A-3 — migraciones que existen en repo pero no llegaban a producción.)*

**🟠 A-1 · Dos modelos de monetización coexisten en BD** *(verificado)*
Conviven el modelo de **créditos** (`user_credit_purchases` 18 filas + `credit_transactions` 54 filas) y el de **planes + overage** (`users.plan_id`/`firmas_usadas_mes`/`overage_charges`). El PRD declara el de packs "inerte", pero la BD soporta ambos simultáneamente. Riesgo de doble contabilidad si algún flujo legacy sigue escribiendo. **Acción:** congelar formalmente el modelo de créditos (solo lectura/auditoría) y documentar la fuente única (`consumir_firma`).

**🟠 A-2 · Doble catálogo de packs** *(verificado)*
`credit_packs` (nuevo) y `pack_types` (legacy) coexisten como catálogos de producto. **Acción:** elegir fuente de verdad única y deprecar la otra para evitar precios divergentes.

**🟠 A-3 · Historial de migraciones roto**
`supabase db push` no es fiable; el SQL nuevo debe aplicarse manualmente desde el SQL Editor. Esto explica directamente C-1 (migraciones que existen pero no llegan a producción). **Acción:** reconciliar el historial (`migration repair`) o reconstruir una baseline limpia; es la causa raíz de varias inconsistencias.

**🟠 A-4 · Funciones y páginas legacy sin retirar** *(verificado)*
Tres pares Edge duplicados (`sign-complete`↔`sign-complete-v2`, `create-checkout-session`↔`create-plan-checkout`, `send-document-invitation`↔`send-invite-v2`) y la página `CreditsPurchase.tsx`. Aumentan superficie de ataque y confusión de mantenimiento; un cliente que invoque la versión vieja salta la lógica nueva. **Acción:** eliminar las versiones obsoletas tras confirmar que ningún cliente las llama.

**🟠 A-5 · RPC sobrecargadas (mismo nombre, varias firmas)** *(verificado)*
`consume_credit` aparece **dos veces**, `get_admin_stats` **dos veces** y `match_knowledge` **tres veces** en el catálogo de funciones. Las sobrecargas son válidas en Postgres, pero ya provocaron un hotfix de ambigüedad (`20260210_fix_consume_credit_ambiguity.sql`). **Acción:** consolidar firmas o renombrar para eliminar ambigüedad de resolución.

**✅ M-1 · `support_chats` y cascada GDPR — DESCARTADO (falso positivo)** *(verificado)*
La hipótesis inicial ("sin FK a usuarios") era un artefacto de la primera introspección (solo listaba FKs hacia `public`). La verificación directa confirma que **`support_chats.user_id` → `auth.users(id)` con `ON DELETE CASCADE`** ya existe; el borrado de cuenta cascadea sobre chats y mensajes. **Sin acción necesaria.**

**🟡 M-2 · Utilidades huérfanas en `lib/` raíz**
`pdf.ts`, `certificate.ts`, `tsa.ts` (deprecado), `credits.ts`, `crypto.ts`, `supabase.ts` no participan del flujo vivo (todo está en Edge Functions). Confunden a quien lee el repo. **Acción:** eliminar o mover a `/_deprecated` con aviso.

**🟡 M-3 · Seguridad por ofuscación del panel admin**
La ruta privada y la pantalla enmascarada **no son un control de acceso**: el control real es rol en BD + RLS + `AdminRoute`. La ofuscación añade fricción pero no debe considerarse defensa. **Acción:** tratarla como capa cosmética; auditar que `AdminRoute` y las RPC `is_admin()`/`is_support()` son la barrera efectiva.

**🟡 M-4 · Credenciales de cliente API pendientes de rotación**
El cliente API externo está desactivado a la espera de rotar credenciales. **Acción:** rotar mediante el script administrativo (no migraciones) y reactivar; confirmar que ningún secreto persiste en el historial de git.

**🔵 B-1 · TypeScript con strict mode relajado**
`noImplicitAny: false` y `strictNullChecks: false` reducen garantías de tipo (se ven `as any` en componentes como `BrandSettings`). **Acción:** endurecer gradualmente por carpeta.

**🔵 B-2 · Residuos de scaffolding**
`lovable-tagger` permanece como devDependency. **Acción:** retirar si no se usa el editor visual.

**🔵 B-3 · CSP con `'unsafe-inline'` en estilos**
`style-src` permite `'unsafe-inline'` (habitual con Tailwind/Radix, pero amplía superficie XSS de estilos). **Acción:** evaluar nonces/hashes si el esfuerzo lo justifica.

### 12.2 Alineación PRD ↔ Código (resumen)

| Área | PRD decía | Realidad verificada | Estado |
|---|---|---|---|
| Marca (logo/color/remitente) | Implementado y en uso | Migración aplicada (18/06): columnas + bucket creados | ✅ Resuelto |
| Modelo de packs | "Inerte" | Tablas y catálogo vivos en BD | 🟠 Parcial |
| Sellado TSA multi-proveedor | 4 TSA con failover | Confirmado en `request-tsa` | ✅ Alineado |
| Consumo de firma | `consumir_firma` única fuente | Confirmado (+ wrappers) | ✅ Alineado |
| Buckets de storage | `brand-logos` + otros | `documents`, `signatures` + `brand-logos` (creado 18/06) | ✅ Alineado |
| Panel admin | Ruta ofuscada | Confirmado; control real = rol+RLS | ✅ Alineado |

### 12.3 Prioridad de remediación recomendada

1. **C-1** (marca sin desplegar) y **A-3** (migraciones) — misma causa raíz; desbloquean lo demás.
2. **A-1/A-2** (doble monetización y catálogo) — riesgo de facturación/precio.
3. **A-4/A-5** (legacy y sobrecargas) — superficie y mantenibilidad.
4. **M-2/M-3/M-4** y **B-x** — higiene y endurecimiento.

---

## 13. Roadmap

### 13.1 Completado (vs. MVP y Fase 2 del PRD v1.0)
- [x] Auth propia (email/password + Google), onboarding, GDPR
- [x] Subida y almacenamiento de documentos; **conversión multiformato Office→PDF**
- [x] Envío por email con **branding** y cobro server-side atómico (branding desplegado en BD el 18/06/2026 — §12 C-1)
- [x] Página de firma pública con visor PDF y **firma sobre canvas**
- [x] **Posicionamiento visual de la firma**
- [x] PDF firmado + **Certificado de Evidencias**
- [x] **Sellado de tiempo multi-TSA** con failover
- [x] **OTP multicanal** (SMS/WhatsApp/email) con rate-limiting y lockout
- [x] **Planes + overage** (Stripe Checkout, Portal, webhooks, facturación de overage)
- [x] Asistente Clara (vía n8n) con rate-limit durable
- [x] Plantillas, agenda de contactos, borradores
- [x] **Panel de administración** (stats, usuarios, créditos, logs, soporte, equipo)
- [x] **Soporte en vivo** (chat Realtime con valoración)
- [x] **API pública + webhooks firmados** (integración de terceros)
- [x] Colas de email y reintentos de webhooks
- [x] i18n (5 idiomas), Sentry, suite de tests (Vitest + Playwright)

### 13.2 Pendiente / Próximo
- [x] ~~Aplicar la migración de marca y crear el bucket `brand-logos`~~ — **hecho el 18/06/2026** (§12 C-1)
- [ ] **Desplegar** completamente el modelo de planes+overage (código listo; revisar sincronía de migraciones/secrets)
- [ ] Resolver la causa raíz **A-3** (historial de migraciones) para evitar nuevas divergencias repo↔producción
- [ ] Retirar funciones/páginas legacy duplicadas (§12 A-4) y consolidar RPC sobrecargadas (§12 A-5)
- [ ] Rotar credenciales del cliente API externo y reactivarlo
- [ ] Resolver la deuda de historial de migraciones (`db push` no fiable)
- [ ] (Opcional legal) Reintento en background del sellado TSA si fallan los 4 proveedores; valorar **PAdES-B-T** (timestamp embebido en el PDF) para auto-verificación con validadores estándar
- [ ] Limpieza de utilidades huérfanas (`lib/pdf.ts`, `lib/certificate.ts`, `lib/tsa.ts`)
- [ ] Múltiples firmantes por documento
- [ ] App móvil nativa

---

## 14. Anexos

### 14.1 Glosario

| Término | Definición |
|---|---|
| Emisor | Usuario de FirmaClara que envía documentos |
| Firmante | Persona que recibe y firma (sin registro) |
| Firma (crédito) | Unidad que permite **enviar** un documento |
| Cuota | Firmas incluidas por mes en el plan |
| Overage | Firma extra del plan Profesional (0,40 €) |
| Pack | Compra única de 15 firmas no caducables |
| TSA | Time Stamping Authority (sellado RFC 3161) |
| TSR | Time-Stamp Response (token devuelto por la TSA) |
| OTP | One-Time Password (código de verificación) |
| Hash | Huella SHA-256 del documento |
| eIDAS | Reglamento (UE) 910/2014 de firma electrónica |
| RLS | Row Level Security (seguridad por fila en Postgres) |

### 14.2 Disclaimer del Certificado

> "Este certificado documenta las evidencias técnicas de la firma electrónica simple realizada a través de FirmaClara. La firma electrónica simple tiene efectos jurídicos conforme al artículo 25 del Reglamento (UE) 910/2014 (eIDAS). Este certificado no constituye firma electrónica cualificada. En caso de disputa, las evidencias aquí recogidas pueden ser presentadas como prueba técnica. FirmaClara no ofrece asesoramiento legal."

### 14.3 Referencias

- Reglamento (UE) 910/2014 (eIDAS) · RFC 3161 (Time-Stamp Protocol) · RFC 5754 (SHA-256 en CMS)
- Código Civil y Código de Comercio español
- Documentación: Supabase, Stripe, Gotenberg, Twilio, Resend, n8n, FreeTSA

---

**Fin del documento PRD v2.1** · Refleja el estado del código auditado archivo por archivo a junio de 2026. Documento saneado para compartir (sin secretos, enlaces internos ni rutas privadas).
