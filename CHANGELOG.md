# Changelog

All notable changes to FirmaClara are documented here.
Format: [version] YYYY-MM-DD — brief description.

---

## [Unreleased] — 2026-06-09

### Fixed
- **Posición de la firma** — el selector mostraba "Última página" pero guardaba el modo anexo (default 0 + handler sin rama `custom`): la firma del cliente nunca aparecía en la posición configurada (bug reportado por cliente). Defaults alineados y rama `custom` añadida en `NewDocument.tsx`.
- **Reembolso de créditos** — el rollback al fallar el envío llamaba a `consume_credit` con importe negativo (bloqueado por seguridad) y parámetro inexistente: el crédito nunca se devolvía. Nueva RPC `refund_credit()` (migración `20260609`) + llamada corregida.
- **Página anexa de firma** — ahora incluye firmante, email, documento, fecha (Europe/Madrid) e IP; antes solo título e imagen flotante. Sanitizador WinAnsi para títulos/nombres con caracteres fuera de Latin-1.

### Added
- **Selector visual de posición de firma** — botón "Elegir el lugar en el documento" en Nuevo Documento: vista previa del PDF (pdf.js, carga diferida) con recuadro arrastrable; convierte la posición a puntos PDF exactos para cualquier tamaño de página (los presets fijos solo eran fiables en A4 vertical). Sin cambios de backend.

### Security
- **API signature-requests** — documentos ligados a un usuario real vía `api_clients.user_id`, consumo de 1 crédito por solicitud (`consume_credit_for_user`, solo service_role), ownership en GET (`api_client_id`), validación de email y `document_url` https, `sign_token` generado explícitamente.
- **Secretos fuera del repo** — API key y webhook secret de Nexo eliminados de la migración (rotar igualmente: estuvieron en disco fuera del gestor de secretos, aunque nunca llegaron a git); cliente `nexo` desactivado hasta rotación; plantilla `scripts/db/setup_api_client.sql`; credenciales reales retiradas de `.env.e2e`.
- **Errores sanitizados** — `send-otp`, `delete-account` y `generate-audit-trail` ya no exponen mensajes internos (Security Check, Database, proveedores).
- **Webhook n8n firmado** — HMAC-SHA256 en `X-FirmaClara-Signature` si `N8N_WEBHOOK_SECRET` está configurado.
- **CSP sin `unsafe-inline` en scripts** — script de Clarity fijado por hash sha256; dominios de Clarity añadidos (antes la propia CSP lo bloqueaba). `Cache-Control: no-store` en `/sign/*`.
- **StealthLogin** — verifica rol admin/support antes de navegar; un usuario normal ya no llega a renderizar el panel.
- **Consolas silenciadas en producción** — `console.error/warn` tras `import.meta.env.DEV` en AuthContext, NewDocument, CreditsPurchase, StealthLogin; `ErrorBoundary` usa `import.meta.env.DEV` (antes `process.env`, que no aplica en Vite).

### Pending (manual)
- Rotar claves Stripe/Resend/Nexo y cambiar contraseña expuesta en `.env.e2e` antiguo.
- Aplicar migración `20260609_api_credits_and_refund.sql` y desplegar funciones `sign-complete-v2`, `signature-requests`, `send-otp`, `delete-account`, `generate-audit-trail`.
- Regenerar `src/integrations/supabase/types.ts` (`npx supabase gen types typescript --project-id pmzfwwtgjvlvuawxguiw`) — elimina los 40 errores restantes de typecheck.

---

## [Unreleased] — 2026-05-25

### Security
- **CORS hardening** — removed wildcard `*` from all 8 Edge Functions; only `firmaclara.com`, `firmaclara.es`, and `localhost` variants are whitelisted
- **XSS prevention** — HTML escaping (`escapeHtml()`) applied to all email templates
- **OTP token not logged** — removed `console.log` that exposed sign tokens and phone numbers in OTP function
- **PII log removal** — removed email recipient, subject, and attachment metadata from `send-signed-notification` logs
- **Webhook URL not logged** — removed N8N_WEBHOOK_URL and user.id exposure from `support-chat` and `clara-chat`
- **Debug log removal** — cleared remaining `console.log` debug calls from `sign-complete` and `send-signed-notification`
- **Admin RPC protection** — added `is_admin()` guard to all 7 admin-only RPC functions (previously callable by any authenticated user)
- **Admin stats secured** — `get_admin_stats` RPC now validates admin role before returning aggregate data
- **Credit INSERT policy** — `credit_transactions` table now has a restrictive INSERT policy (was open to authenticated users)
- **Storage bucket limits** — MIME type and file size limits applied to document and signature buckets
- **Password minimum length** — increased from 8 to 12 characters; requires uppercase, lowercase, and digit
- **OTP codes not stored in plaintext** — hashed with SHA-256 before database storage
- **Error sanitization** — stack traces no longer exposed in Edge Function error responses
- **Input validation** — server-side validation for signature images (PNG, max 500 KB) and token format (UUID)

### Bug Fixes
- **`admin_revoke_credits` FIFO fix** — function now iterates credit packs in FIFO order when revoking; previously failed silently if no single pack covered the full amount
- **Supabase URL/key from env** — removed hardcoded credentials from `src/integrations/supabase/client.ts`; now reads from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### Features
- **Live support chat** — `SupportChat` widget now mounted in `AuthenticatedLayout`; visible on all authenticated pages
- **Help page chat integration** — "Chat en directo" card on `/help` opens the chat widget via `useRef`
- **Support chat avatar** — replaced "FC" placeholder text with actual `logo.jpg` in chat header
- **Support button position** — fixed `position: relative` conflicting with `position: fixed`; button now anchors to bottom-right corner

### Tests
- **Security utility tests** — `src/test/security.test.ts`: 15 tests covering `sanitizeErrorMessage`, `escapeHtml`, `getCorsHeaders`
- **Password validator tests** — 8 new boundary tests for the 12-character minimum and character-class requirements
- **Register page tests** — rewritten to match actual component (no confirm-password field, correct button label)
- **SignDocument test** — fixed text matcher to match actual error message rendered by component

### Performance
- **Bundle splitting** — `tanstack` (35 KB) and `router` (36 KB) extracted from `vendor.js`; vendor reduced from 641 KB → 570 KB; chunks cached independently across deploys
- **Dashboard query limit** — added `.limit(50)` to documents query; previously unbounded (full table scan per user)
- **Redundant DB indexes removed** — `idx_docs_token` and `idx_documents_sign_token` dropped; unique constraint on `sign_token` already covers both; reduces write overhead
- **Missing DB indexes added** — `idx_support_chats_user_id` and `idx_support_messages_chat_id` for support chat queries

### Refactoring
- **`StatCardValue` component** — extracted from `Dashboard.tsx`; eliminates the same skeleton-vs-value ternary repeated across 3 stat cards
- **`applyClosedChatState` helper** — centralized "mark closed + skip rating if already rated" logic in `SupportChat.tsx`; was duplicated in 4 call sites (session restore, initial fetch, realtime UPDATE, polling fallback)

### Documentation
- **`README.md`** — full rewrite; replaced Lovable scaffold with actual project docs (setup, architecture, deploy, security)
- **`.env.example`** — created with all required variables and notes on live vs. test Stripe keys
- **`CHANGELOG.md`** — this file
- **`docs/decisions.md`** — technical decisions log (ADR-style)
- **JSDoc** — added to `SupportChat` public API and `_shared/cors.ts` utilities

---

## Previous work (before 2026-05-25)

- Sentry error monitoring integrated
- Double-send email prevention
- Stripe API version pinned
- `robots.txt` added
- Error UX improvements on document signing
- RLS (Row Level Security) enabled on all tables
- View-based RLS for admin queries
- Stripe webhook signature verification
