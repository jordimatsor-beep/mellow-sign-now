# Changelog

All notable changes to FirmaClara are documented here.
Format: [version] YYYY-MM-DD — brief description.

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

### Documentation
- **`.env.example`** — created with all required variables and notes on live vs. test Stripe keys
- **`CHANGELOG.md`** — this file

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
