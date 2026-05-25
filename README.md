# FirmaClara

Plataforma de firma electrónica simple con certificado de evidencias para autónomos y pequeñas empresas en España. Cumple con el reglamento eIDAS para contratos comerciales del día a día.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Vite 7 · React 18 · TypeScript · Tailwind CSS · shadcn/ui |
| Routing | React Router DOM 7 |
| Estado servidor | TanStack React Query 5 |
| Formularios | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Pagos | Stripe (Checkout Sessions + Webhooks) |
| Email | Resend (directo) · n8n (automatizaciones) |
| SMS/WhatsApp OTP | Twilio |
| IA | Google Gemini 1.5 Flash (asistente Clara) |
| PDF | pdf-lib · FreeTSA (sello RFC 3161) |
| i18n | i18next (ES · EN · CA · FR · PT) |
| Tests | Vitest · React Testing Library |
| Deploy | Vercel (frontend) · Supabase Cloud (backend) |

---

## Instalación local

### Requisitos previos
- Node.js 20+
- Supabase CLI (`npm install -g supabase`)

### Pasos

```sh
# 1. Clonar
git clone https://github.com/jordimatsor-beep/mellow-sign-now.git
cd mellow-sign-now

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Edita .env.local con tus valores reales

# 4. Arrancar servidor de desarrollo
npm run dev
# → http://localhost:8080
```

### Variables de entorno requeridas

Ver [`.env.example`](.env.example) para la lista completa con notas.

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave anon pública de Supabase |
| `VITE_STRIPE_PUBLIC_KEY` | Clave pública de Stripe (`pk_live_` en producción) |

> Las claves secretas (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`, etc.) van en **Supabase Secrets**, nunca en el frontend.

---

## Comandos

```sh
npm run dev          # Servidor de desarrollo con HMR (puerto 8080)
npm run build        # Build de producción
npm run preview      # Preview del build de producción
npm test             # Ejecutar suite de tests (Vitest)
npx vitest run       # Tests sin modo watch
npx vitest --ui      # Interfaz visual de tests
```

---

## Testing

```sh
npm test
```

Tests en `src/test/` y `src/**/__tests__/`. Cobertura actual: **62 tests**.

Áreas cubiertas:
- Validadores (NIF/NIE/CIF, email, teléfono, contraseña, URL)
- Utilidades de seguridad (`sanitizeErrorMessage`, `escapeHtml`, `getCorsHeaders`)
- Páginas de autenticación (Register, SignDocument)

---

## Arquitectura

```
src/
├── pages/              # Páginas por ruta
│   ├── auth/           # Login, Register, UpdatePassword
│   ├── admin/          # Panel de administración
│   └── *.tsx           # Dashboard, Documents, Clara, Help…
├── components/
│   ├── ui/             # Componentes shadcn/ui
│   ├── layout/         # AuthenticatedLayout, Sidebar, Header, BottomNav
│   └── SupportChat.tsx # Widget de chat de soporte en vivo
├── context/            # AuthContext, ProfileContext
├── hooks/              # useCredits, useMobile, useToast
├── lib/                # validators.ts, utils.ts, stripe.ts, queryKeys.ts
└── locales/            # Traducciones i18n (es/en/ca/fr/pt)

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── _shared/        # cors.ts (CORS, escapeHtml, sanitizeErrorMessage)
│   ├── clara-chat/     # Asistente IA (Gemini)
│   ├── create-checkout-session/  # Stripe payments
│   ├── stripe-webhook/ # Procesa pagos completados
│   ├── send-otp/       # OTP por SMS/WhatsApp (Twilio)
│   ├── sign-complete-v2/         # Finaliza firma + TSA
│   └── …
└── migrations/         # Migraciones SQL aplicadas en orden
```

### Flujo de firma de documento

```
Usuario sube PDF → consume_credit() → send-invite-v2 (email al firmante)
                                           ↓
Firmante abre /sign/:token → OTP por SMS → firma → sign-complete-v2
                                                         ↓
                                              TSA timestamp (FreeTSA)
                                                         ↓
                                              PDF firmado + certificado
                                                         ↓
                                          send-signed-notification → email al emisor
```

### Sistema de créditos

- `user_credit_purchases` — cada compra (ledger FIFO)
- `credit_transactions` — historial de operaciones
- `consume_credit(amount)` — RPC que deduce en FIFO con lock
- 1 crédito = 1 documento enviado (no al firmarse)
- Los créditos no caducan

---

## Deploy

### Frontend — Vercel

El deploy se dispara automáticamente con cada push a `main`.

Variables de entorno en Vercel Dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLIC_KEY` ← debe ser `pk_live_` en Production

### Backend — Supabase

**Secrets de Edge Functions** (una vez, vía CLI):
```sh
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set GEMINI_API_KEY=...
supabase secrets set RESEND_API_KEY=...
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set N8N_WEBHOOK_URL=...
```

O usando el script interactivo: `.\scripts\setup_secrets.ps1`

**Migraciones** se aplican automáticamente en orden desde `supabase/migrations/`.

---

## Seguridad

- RLS activado en todas las tablas
- CORS con whitelist explícita (sin wildcard)
- Contraseñas: mínimo 12 caracteres, mayúscula + minúscula + número
- OTP hasheado con SHA-256 antes de almacenar
- Stack traces no expuestos en respuestas de error
- CSP, HSTS, X-Frame-Options configurados en `vercel.json`
- Imágenes de firma validadas server-side (PNG, max 500 KB)

Ver [CHANGELOG.md](CHANGELOG.md) para el historial completo de cambios de seguridad.
