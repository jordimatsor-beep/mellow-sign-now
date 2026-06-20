# FirmaClara Billing System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar facturación legal automática (Holded, serie FC, IVA/IGIC) y cancelación/reactivación de suscripciones en la app.

**Architecture:**
- Dos migraciones SQL añaden `billing_profiles` (datos fiscales) + `invoices` (idempotencia Holded) y columnas `subscription_period_end` / `subscription_cancel_at_period_end` en `users`.
- Tras cada pago confirmado, `stripe-webhook` llama `triggerN8n('billing.checkout_completed', ...)` usando el helper `_shared/n8n.ts` ya existente (adaptación del PRD: en vez de un webhook Stripe separado a n8n, el edge function de Supabase lo dispara — más simple y reutiliza infraestructura existente).
- Dos nuevos edge functions (`cancel-subscription`, `reactivate-subscription`) permiten cancelar/reactivar sin salir de la app.
- `BillingProfileModal` intercepta el checkout para recoger NIF/CIF y dirección antes de redirigir a Stripe.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + Edge Functions / Deno), Stripe 14.x, Holded API REST, n8n (VPS `n8n.operia.click`)

**PRD de referencia:** `firmaclara_billing_PRD.md` (en el contexto de la conversación)

---

## Prerequisites (pasos manuales, una sola vez)

Antes de implementar, solicitar a Jordi:

1. **VPS env vars** — añadir a `/etc/systemd/system/n8n.service`:
   ```
   HOLDED_API_KEY=b35027c6362fbb9774dd5bb8475735ec
   ```
   Luego: `systemctl daemon-reload && systemctl restart n8n`

2. **Supabase secret** — en Dashboard → Edge Functions → Secrets:
   ```
   N8N_WEBHOOK_URL=https://n8n.operia.click/webhook/firmaclara-billing
   ```
   (Asegúrate de que `N8N_WEBHOOK_SECRET` también esté configurado para firmar las llamadas.)

3. **Holded** — verificar que existe el tipo impositivo "IGIC 7%": Configuración → Impuestos. Crear si no existe.

4. **n8n** — crear credencial "Holded API" (tipo: Header Auth, header: `key`, valor: `{{ $env.HOLDED_API_KEY }}`).

---

## Chunk 1: Database Migrations

### Task 1: Tablas billing_profiles e invoices

**Files:**
- Create: `supabase/migrations/20260619_billing_tables.sql`

- [ ] **Step 1.1: Escribir la migración**

Crear `supabase/migrations/20260619_billing_tables.sql`:

```sql
-- ============================================================
-- 2026-06-19 · Sistema de facturación: billing_profiles e invoices
-- PRD §3.1 y §3.2
-- ============================================================

BEGIN;

-- ── billing_profiles: datos fiscales del cliente para Holded ──────────
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razon_social      TEXT NOT NULL,
  nif_cif           TEXT NOT NULL,
  direccion_fiscal  TEXT NOT NULL,
  ciudad            TEXT NOT NULL,
  codigo_postal     TEXT NOT NULL,
  pais              TEXT NOT NULL DEFAULT 'ES',
  -- Calculado al guardar: 'IVA_ES' (península+Baleares) | 'IGIC_IC' (Canarias) | 'EXENTO_EU'
  regimen_fiscal    TEXT NOT NULL DEFAULT 'IVA_ES'
    CHECK (regimen_fiscal IN ('IVA_ES', 'IGIC_IC', 'EXENTO_EU')),
  email_facturacion TEXT,         -- NULL = usar email de la cuenta
  holded_contact_id TEXT,         -- Rellenado tras crear/encontrar contacto en Holded
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_profiles_user ON public.billing_profiles(user_id);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own billing profile" ON public.billing_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User manages own billing profile" ON public.billing_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own billing profile" ON public.billing_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access billing_profiles" ON public.billing_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_billing_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_profile_updated_at();

-- ── invoices: registro de facturas Holded (idempotencia via UNIQUE) ───
CREATE TABLE IF NOT EXISTS public.invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id),
  -- UNIQUE garantiza idempotencia: si el webhook llega dos veces falla el INSERT
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  holded_invoice_id        TEXT,
  numero_fc                TEXT,
  concepto                 TEXT NOT NULL,
  base_imponible           NUMERIC(10,2) NOT NULL,
  regimen_fiscal           TEXT NOT NULL,
  iva_pct                  NUMERIC(5,2) NOT NULL,
  importe_impuesto         NUMERIC(10,2) NOT NULL,
  total                    NUMERIC(10,2) NOT NULL,
  product_type             TEXT NOT NULL,
  holded_status            TEXT DEFAULT 'pending'
    CHECK (holded_status IN ('pending', 'created', 'sent', 'error')),
  error_detail             TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user       ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_pi  ON public.invoices(stripe_payment_intent_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access invoices" ON public.invoices
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;
```

- [ ] **Step 1.2: Aplicar en Supabase SQL Editor**

Ir a Supabase Dashboard → SQL Editor → New query, pegar el SQL y ejecutar.
Verificar: sin errores, tablas `billing_profiles` e `invoices` visibles en Table Editor.

- [ ] **Step 1.3: Commit**

```bash
git add supabase/migrations/20260619_billing_tables.sql
git commit -m "feat(billing): add billing_profiles and invoices tables"
```

---

### Task 2: Columnas subscription_period_end + cancel_at_period_end en users

**Files:**
- Create: `supabase/migrations/20260619_subscription_period.sql`

- [ ] **Step 2.1: Escribir la migración**

Crear `supabase/migrations/20260619_subscription_period.sql`:

```sql
-- ============================================================
-- 2026-06-19 · Periodo de suscripción y flag de cancelación programada
-- PRD §8.4
-- ============================================================

BEGIN;

-- Nuevas columnas en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Extender guard_user_update para proteger los nuevos campos de billing.
-- IMPORTANTE: reemplaza la función definida en 20260612130000_pricing_plans.sql
CREATE OR REPLACE FUNCTION public.guard_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_trusted  BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();
  v_trusted := COALESCE(auth.role(), '') = 'service_role'
            OR COALESCE(current_setting('app.billing_ctx', true), '') = 'on';

  IF NOT v_is_admin AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: cannot modify role';
  END IF;

  IF NOT v_is_admin THEN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Permission denied: cannot modify email';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Permission denied: cannot modify id';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Permission denied: cannot modify created_at';
    END IF;
  END IF;

  -- Campos de facturación: solo admin, service_role o funciones SECURITY DEFINER
  -- que activen la marca app.billing_ctx (consumir_firma, add_firmas_creditos, etc.).
  IF NOT v_is_admin AND NOT v_trusted THEN
    IF NEW.plan_id                              IS DISTINCT FROM OLD.plan_id
       OR NEW.firmas_creditos                   IS DISTINCT FROM OLD.firmas_creditos
       OR NEW.firmas_usadas_mes                 IS DISTINCT FROM OLD.firmas_usadas_mes
       OR NEW.stripe_customer_id                IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id            IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status               IS DISTINCT FROM OLD.subscription_status
       OR NEW.grace_until                       IS DISTINCT FROM OLD.grace_until
       OR NEW.plan_renewed_at                   IS DISTINCT FROM OLD.plan_renewed_at
       OR NEW.subscription_period_end           IS DISTINCT FROM OLD.subscription_period_end
       OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
    THEN
      RAISE EXCEPTION 'Permission denied: cannot modify billing fields';
    END IF;
  END IF;

  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Actualizar get_plan_status() para incluir los nuevos campos.
-- IMPORTANTE: reemplaza la versión de 20260612130000_pricing_plans.sql
CREATE OR REPLACE FUNCTION public.get_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_u       public.users%ROWTYPE;
  v_limite  integer;
  v_overage integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'no_auth');
  END IF;

  SELECT * INTO v_u FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'no_user');
  END IF;

  v_limite := public.firmas_limite_plan(v_u.plan_id);

  SELECT COUNT(*) INTO v_overage
  FROM public.overage_charges
  WHERE user_id = v_user_id
    AND mes_ciclo = date_trunc('month', now())::date;

  RETURN jsonb_build_object(
    'ok',                              true,
    'plan_id',                         v_u.plan_id,
    'subscription_status',             v_u.subscription_status,
    'firmas_usadas_mes',               v_u.firmas_usadas_mes,
    'limite',                          v_limite,
    'firmas_creditos',                 v_u.firmas_creditos,
    'overage_firmas',                  v_overage,
    'overage_eur',                     round(v_overage * 0.40, 2),
    'plan_renewed_at',                 v_u.plan_renewed_at,
    'grace_until',                     v_u.grace_until,
    'subscription_period_end',         v_u.subscription_period_end,
    'subscription_cancel_at_period_end', v_u.subscription_cancel_at_period_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_status() TO authenticated;

COMMIT;
```

- [ ] **Step 2.2: Aplicar en Supabase SQL Editor**

Pegar en SQL Editor y ejecutar. Verificar: sin errores.

- [ ] **Step 2.3: Commit**

```bash
git add supabase/migrations/20260619_subscription_period.sql
git commit -m "feat(billing): add subscription_period_end and cancel_at_period_end to users + update get_plan_status"
```

---

## Chunk 2: Edge Functions

### Task 3: Actualizar stripe-webhook — periodo de suscripción + trigger n8n

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

Cambios necesarios:
1. Importar `triggerN8n` de `_shared/n8n.ts`
2. Añadir caso `customer.subscription.created` en el switch (mismo handler que `updated`)
3. En `handleSubscriptionUpdated`: leer y guardar `cancel_at_period_end` + `current_period_end`
4. En `handleSubscriptionDeleted`: limpiar `subscription_period_end` y `subscription_cancel_at_period_end`
5. En `handleCheckoutSessionCompleted`: llamar `triggerN8nBilling()` al final (non-fatal)

- [ ] **Step 3.1: Añadir import de triggerN8n**

Al inicio de `supabase/functions/stripe-webhook/index.ts`, después de los imports existentes, añadir:

```typescript
import { triggerN8n } from '../_shared/n8n.ts'
```

- [ ] **Step 3.2: Añadir customer.subscription.created en el switch**

En el bloque `switch (eventType)`, añadir antes del case `customer.subscription.updated`:

```typescript
case 'customer.subscription.created':
  await handleSubscriptionUpdated(supabaseAdmin, event, eventId)
  break
```

- [ ] **Step 3.3: Reemplazar handleSubscriptionUpdated completo**

Reemplazar la función `handleSubscriptionUpdated` existente con:

```typescript
async function handleSubscriptionUpdated(
  supabaseAdmin: SupabaseClient,
  event: Record<string, unknown>,
  eventId: string
) {
  const sub = getNestedObject(event, ['data', 'object'])
  const customerId = getNestedString(sub, ['customer'])
  const subscriptionId = getNestedString(sub, ['id'])
  const status = getNestedString(sub, ['status'])
  const priceId = getNestedString(sub, ['items', 'data', '0', 'price', 'id'])
  const cancelAtPeriodEnd = getNestedObject(sub, ['cancel_at_period_end']) === true
  const currentPeriodEndRaw = getNestedObject(sub, ['current_period_end'])

  const newPlan = planFromPriceId(priceId)
  const user = customerId ? await findUserByCustomer(supabaseAdmin, customerId) : null
  if (!user) {
    console.warn(`subscription.updated: no user for customer ${customerId}`)
    return
  }

  const prevPlan = user.plan_id ?? 'gratis'
  const subStatus = mapSubStatus(status)
  const periodEndIso = currentPeriodEndRaw
    ? new Date(Number(currentPeriodEndRaw) * 1000).toISOString()
    : null

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscriptionId || user.stripe_subscription_id || null,
    subscription_status: subStatus,
    subscription_cancel_at_period_end: cancelAtPeriodEnd,
  }
  if (periodEndIso) {
    update.subscription_period_end = periodEndIso
  }
  if (newPlan && !cancelAtPeriodEnd) {
    update.plan_id = newPlan
  }
  if (subStatus === 'active') {
    update.grace_until = null
  }

  const { error } = await supabaseAdmin.from('users').update(update).eq('id', user.id)
  if (error) throw new Error(`Failed to update subscription: ${error.message}`)

  if (newPlan && newPlan !== prevPlan && !cancelAtPeriodEnd) {
    await insertPlanHistory(supabaseAdmin, user.id, prevPlan, newPlan,
      motiveForChange(prevPlan, newPlan), eventId)
  }
}
```

- [ ] **Step 3.4: Reemplazar handleSubscriptionDeleted**

```typescript
async function handleSubscriptionDeleted(
  supabaseAdmin: SupabaseClient,
  event: Record<string, unknown>,
  eventId: string
) {
  const sub = getNestedObject(event, ['data', 'object'])
  const customerId = getNestedString(sub, ['customer'])
  const user = customerId ? await findUserByCustomer(supabaseAdmin, customerId) : null
  if (!user) {
    console.warn(`subscription.deleted: no user for customer ${customerId}`)
    return
  }

  const prevPlan = user.plan_id ?? 'gratis'
  const { error } = await supabaseAdmin.from('users').update({
    plan_id: 'gratis',
    subscription_status: 'canceled',
    stripe_subscription_id: null,
    firmas_usadas_mes: 0,
    plan_renewed_at: new Date().toISOString(),
    grace_until: null,
    subscription_period_end: null,
    subscription_cancel_at_period_end: false,
  }).eq('id', user.id)
  if (error) throw new Error(`Failed to downgrade to free: ${error.message}`)

  await insertPlanHistory(supabaseAdmin, user.id, prevPlan, 'gratis', 'cancelacion', eventId)
}
```

- [ ] **Step 3.5: Añadir función triggerN8nBilling y llamarla en handleCheckoutSessionCompleted**

Añadir esta función antes del cierre del archivo (después de `updateWebhookEventFailed`):

```typescript
async function triggerN8nBilling(
  supabaseAdmin: SupabaseClient,
  userId: string,
  paymentIntentId: string,
  amountCents: number,
  metadata: Record<string, unknown>
) {
  // Leer billing_profile del usuario (necesario para el tipo impositivo y Holded)
  const { data: billingProfile } = await supabaseAdmin
    .from('billing_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!billingProfile) {
    // Sin perfil fiscal no se puede generar factura. Se loguea como warning (no bloquea).
    console.warn(`triggerN8nBilling: no billing_profile for user ${userId} — skipping invoice`)
    return
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  await triggerN8n('billing.checkout_completed', {
    payment_intent_id: paymentIntentId,
    user_id: userId,
    amount_cents: amountCents,
    product_type: String(metadata['product_type'] ?? ''),
    plan_name: String(metadata['plan_name'] ?? ''),
    pack_quantity: String(metadata['pack_quantity'] ?? ''),
    billing_profile: billingProfile,
    user_email: userRow?.email ?? '',
  })
}
```

Y al final de `handleCheckoutSessionCompleted` (después de los dos bloques `if (mode === 'subscription')` e `if (mode === 'payment')`), añadir:

```typescript
  // Trigger n8n para generación de factura en Holded (non-fatal: un fallo no bloquea el webhook)
  const paymentIntentId = getNestedString(session, ['payment_intent']) || getNestedString(session, ['id'])
  const amountCents = Number(getNestedObject(session, ['amount_total']) ?? 0)
  triggerN8nBilling(supabaseAdmin, userId, paymentIntentId, amountCents, metadata as Record<string, unknown>)
    .catch((e) => console.error('triggerN8nBilling non-fatal error:', e instanceof Error ? e.message : e))
```

- [ ] **Step 3.6: Deploy stripe-webhook**

```bash
supabase functions deploy stripe-webhook --project-ref pmzfwwtgjvlvuawxguiw
```

- [ ] **Step 3.7: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(billing): store subscription period end + trigger n8n billing after checkout"
```

---

### Task 4: Actualizar create-plan-checkout — añadir product_type al metadata

**Files:**
- Modify: `supabase/functions/create-plan-checkout/index.ts`

- [ ] **Step 4.1: Ampliar metadata de la sesión de Stripe**

En `create-plan-checkout/index.ts`, localizar el objeto `metadata:` dentro de `stripe.checkout.sessions.create(...)` y reemplazarlo:

```typescript
metadata: {
  user_id: user.id,
  plan_id: isPack ? 'pack_puntual' : plan,
  product_type: isPack ? 'pack_creditos' : 'plan_mensual',
  plan_name: isPack ? '' : (plan === 'basico' ? 'Básico' : 'Profesional'),
  pack_quantity: isPack ? '15' : '',
  ...(isPack ? { credits: '15' } : {}),
},
```

- [ ] **Step 4.2: Deploy create-plan-checkout**

```bash
supabase functions deploy create-plan-checkout --project-ref pmzfwwtgjvlvuawxguiw
```

- [ ] **Step 4.3: Commit**

```bash
git add supabase/functions/create-plan-checkout/index.ts
git commit -m "feat(billing): add product_type/plan_name to checkout session metadata"
```

---

### Task 5: Nuevo edge function — cancel-subscription

**Files:**
- Create: `supabase/functions/cancel-subscription/deno.json`
- Create: `supabase/functions/cancel-subscription/index.ts`

- [ ] **Step 5.1: Crear deno.json**

Crear `supabase/functions/cancel-subscription/deno.json`:
```json
{ "compilerOptions": { "lib": ["deno.ns"] } }
```

- [ ] **Step 5.2: Crear index.ts**

Crear `supabase/functions/cancel-subscription/index.ts`:

```typescript
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://firmaclara.com', 'https://firmaclara.es',
  'https://www.firmaclara.com', 'https://www.firmaclara.es',
  'http://localhost:8080', 'http://localhost:8081',
  'http://localhost:3000', 'http://localhost:5173',
]

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle()

    const subscriptionId = profile?.stripe_subscription_id as string | undefined
    if (!subscriptionId) return json({ error: 'no_subscription' }, 400, corsHeaders)

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    return json({
      ok: true,
      period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }, 200, corsHeaders)
  } catch (error: unknown) {
    console.error('cancel-subscription error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500, corsHeaders)
  }
})

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 5.3: Deploy cancel-subscription**

```bash
supabase functions deploy cancel-subscription --project-ref pmzfwwtgjvlvuawxguiw
```

- [ ] **Step 5.4: Commit**

```bash
git add supabase/functions/cancel-subscription/
git commit -m "feat(billing): add cancel-subscription edge function"
```

---

### Task 6: Nuevo edge function — reactivate-subscription

**Files:**
- Create: `supabase/functions/reactivate-subscription/deno.json`
- Create: `supabase/functions/reactivate-subscription/index.ts`

- [ ] **Step 6.1: Crear deno.json**

Crear `supabase/functions/reactivate-subscription/deno.json`:
```json
{ "compilerOptions": { "lib": ["deno.ns"] } }
```

- [ ] **Step 6.2: Crear index.ts**

Crear `supabase/functions/reactivate-subscription/index.ts`:

```typescript
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://firmaclara.com', 'https://firmaclara.es',
  'https://www.firmaclara.com', 'https://www.firmaclara.es',
  'http://localhost:8080', 'http://localhost:8081',
  'http://localhost:3000', 'http://localhost:5173',
]

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id, subscription_cancel_at_period_end')
      .eq('id', user.id)
      .maybeSingle()

    const subscriptionId = profile?.stripe_subscription_id as string | undefined
    if (!subscriptionId) return json({ error: 'no_subscription' }, 400, corsHeaders)

    // Guardia: solo reactivar si estaba marcada para cancelar
    if (!profile?.subscription_cancel_at_period_end) {
      return json({ error: 'not_canceling' }, 400, corsHeaders)
    }

    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })

    return json({ ok: true }, 200, corsHeaders)
  } catch (error: unknown) {
    console.error('reactivate-subscription error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500, corsHeaders)
  }
})

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 6.3: Deploy reactivate-subscription**

```bash
supabase functions deploy reactivate-subscription --project-ref pmzfwwtgjvlvuawxguiw
```

- [ ] **Step 6.4: Commit**

```bash
git add supabase/functions/reactivate-subscription/
git commit -m "feat(billing): add reactivate-subscription edge function"
```

---

## Chunk 3: Frontend

### Task 7: Hook useBillingProfile

**Files:**
- Create: `src/hooks/useBillingProfile.ts`

- [ ] **Step 7.1: Crear el hook**

Crear `src/hooks/useBillingProfile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface BillingProfile {
  id?: string;
  user_id?: string;
  razon_social: string;
  nif_cif: string;
  direccion_fiscal: string;
  ciudad: string;
  codigo_postal: string;
  pais: string;
  regimen_fiscal: string;
  email_facturacion: string;
  holded_contact_id?: string | null;
}

// Calcula el régimen fiscal según código postal y país (PRD §3.1)
function calcRegimenFiscal(codigoPostal: string, pais: string): string {
  if (pais !== 'ES') return 'EXENTO_EU';
  if (codigoPostal.startsWith('35') || codigoPostal.startsWith('38')) return 'IGIC_IC';
  return 'IVA_ES';
}

export function useBillingProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['billing_profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as BillingProfile | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Omit<BillingProfile, 'id' | 'user_id' | 'regimen_fiscal' | 'holded_contact_id'>) => {
      const regimen_fiscal = calcRegimenFiscal(values.codigo_postal, values.pais);
      const { error } = await supabase
        .from('billing_profiles')
        .upsert(
          { ...values, user_id: user!.id, regimen_fiscal },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_profile', user?.id] });
    },
  });

  return { profile: query.data, isLoading: query.isLoading, upsert };
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/hooks/useBillingProfile.ts
git commit -m "feat(billing): add useBillingProfile hook"
```

---

### Task 8: Componente BillingProfileModal

**Files:**
- Create: `src/components/billing/BillingProfileModal.tsx`

- [ ] **Step 8.1: Crear el componente**

Crear `src/components/billing/BillingProfileModal.tsx`:

```tsx
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import { toast } from "sonner";

const schema = z.object({
  razon_social:     z.string().min(1, "Obligatorio"),
  nif_cif:          z.string().min(1, "Obligatorio").regex(/^[A-Z0-9]{9}$/i, "Formato NIF/CIF inválido"),
  direccion_fiscal: z.string().min(1, "Obligatorio"),
  ciudad:           z.string().min(1, "Obligatorio"),
  codigo_postal:    z.string().regex(/^\d{5}$/, "5 dígitos"),
  pais:             z.string().min(1, "Obligatorio"),
  email_facturacion: z.string().email("Email inválido").or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function BillingProfileModal({ open, onClose, onConfirm }: Props) {
  const { profile, upsert } = useBillingProfile();
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, formState: { errors },
    setValue, watch, reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pais: 'ES', email_facturacion: '' },
  });

  const pais = watch('pais');

  useEffect(() => {
    if (open && profile) {
      reset({
        razon_social:      profile.razon_social,
        nif_cif:           profile.nif_cif,
        direccion_fiscal:  profile.direccion_fiscal,
        ciudad:            profile.ciudad,
        codigo_postal:     profile.codigo_postal,
        pais:              profile.pais,
        email_facturacion: profile.email_facturacion ?? '',
      });
    }
  }, [open, profile, reset]);

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      await upsert.mutateAsync(values);
      await onConfirm();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar los datos de facturación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Datos de facturación</DialogTitle>
          <DialogDescription>
            Necesitamos tus datos fiscales para emitir la factura legal de tu compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nombre / Razón social *</Label>
              <Input {...register('razon_social')} placeholder="Mi Empresa S.L." />
              {errors.razon_social && (
                <p className="text-xs text-destructive">{errors.razon_social.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>NIF / CIF *</Label>
              <Input
                {...register('nif_cif')}
                placeholder="B12345678"
                className="uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  register('nif_cif').onChange(e);
                }}
              />
              {errors.nif_cif && (
                <p className="text-xs text-destructive">{errors.nif_cif.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>País</Label>
              <Select value={pais} onValueChange={(v) => setValue('pais', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ES">España</SelectItem>
                  <SelectItem value="FR">Francia</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="OTHER">Otro país</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pais !== 'ES' && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200">
              Para clientes fuera de España, contacta con nosotros en{' '}
              <strong>facturacion@operiatech.es</strong> para gestionar tu factura manualmente.
            </p>
          )}

          <div className="space-y-1">
            <Label>Dirección fiscal *</Label>
            <Input {...register('direccion_fiscal')} placeholder="Calle Mayor 1, 2º A" />
            {errors.direccion_fiscal && (
              <p className="text-xs text-destructive">{errors.direccion_fiscal.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>C. Postal *</Label>
              <Input {...register('codigo_postal')} placeholder="28001" maxLength={5} />
              {errors.codigo_postal && (
                <p className="text-xs text-destructive">{errors.codigo_postal.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Ciudad *</Label>
              <Input {...register('ciudad')} placeholder="Madrid" />
              {errors.ciudad && (
                <p className="text-xs text-destructive">{errors.ciudad.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Email para recibir facturas</Label>
            <Input
              {...register('email_facturacion')}
              type="email"
              placeholder="Si está vacío, se usa el email de tu cuenta"
            />
            {errors.email_facturacion && (
              <p className="text-xs text-destructive">{errors.email_facturacion.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || pais !== 'ES'}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y continuar al pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add src/components/billing/BillingProfileModal.tsx
git commit -m "feat(billing): add BillingProfileModal component"
```

---

### Task 9: Interceptar checkout en billing.ts y Precios.tsx

**Files:**
- Modify: `src/lib/billing.ts`
- Modify: `src/pages/Precios.tsx`

- [ ] **Step 9.1: Añadir hasBillingProfile a billing.ts**

Al final de `src/lib/billing.ts`, añadir:

```typescript
/**
 * Devuelve true si el usuario ya tiene un billing_profile guardado.
 * Se usa para decidir si mostrar el modal de datos fiscales antes del checkout.
 */
export async function hasBillingProfile(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('billing_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}
```

- [ ] **Step 9.2: Actualizar Precios.tsx para mostrar el modal**

En `src/pages/Precios.tsx`:

**Añadir imports** (junto con los existentes al inicio):
```typescript
import { BillingProfileModal } from "@/components/billing/BillingProfileModal";
import { hasBillingProfile } from "@/lib/billing";
```

**Añadir estado** (junto con los estados existentes en el componente):
```typescript
const [billingModalOpen, setBillingModalOpen] = useState(false);
const [pendingCheckout, setPendingCheckout] = useState<{
  plan: PlanChoice;
  opts?: { acceptOverage?: boolean };
} | null>(null);
```

**Reemplazar la función `checkout`**:
```typescript
const checkout = async (plan: PlanChoice, opts?: { acceptOverage?: boolean }) => {
  if (!user) return;
  // Si no tiene perfil fiscal, mostrar modal primero
  const hasProfile = await hasBillingProfile(user.id);
  if (!hasProfile) {
    setPendingCheckout({ plan, opts });
    setBillingModalOpen(true);
    return;
  }
  setLoadingPlan(plan);
  try {
    await startPlanCheckout(plan, opts);
  } finally {
    setLoadingPlan(null);
  }
};
```

**Añadir el modal al JSX** (justo antes del `<Dialog open={overageOpen}>` existente):
```tsx
<BillingProfileModal
  open={billingModalOpen}
  onClose={() => {
    setBillingModalOpen(false);
    setPendingCheckout(null);
  }}
  onConfirm={async () => {
    setBillingModalOpen(false);
    if (!pendingCheckout) return;
    const { plan, opts } = pendingCheckout;
    setPendingCheckout(null);
    setLoadingPlan(plan);
    try {
      await startPlanCheckout(plan, opts);
    } finally {
      setLoadingPlan(null);
    }
  }}
/>
```

- [ ] **Step 9.3: Commit**

```bash
git add src/lib/billing.ts src/pages/Precios.tsx
git commit -m "feat(billing): gate checkout behind BillingProfileModal when fiscal data is missing"
```

---

### Task 10: Actualizar tipo PlanStatus en usePlanStatus

**Files:**
- Modify: `src/hooks/usePlanStatus.ts`

- [ ] **Step 10.1: Añadir nuevos campos al interface PlanStatus**

En `src/hooks/usePlanStatus.ts`, ampliar la interfaz `PlanStatus`:

```typescript
export interface PlanStatus {
  ok: boolean;
  plan_id: PlanId;
  subscription_status: "active" | "past_due" | "canceled" | "trialing";
  firmas_usadas_mes: number;
  limite: number;
  firmas_creditos: number;
  overage_firmas: number;
  overage_eur: number;
  plan_renewed_at: string | null;
  grace_until: string | null;
  subscription_period_end: string | null;             // ISO — cuándo vence el ciclo
  subscription_cancel_at_period_end: boolean;         // true = se cancela al vencer
}
```

- [ ] **Step 10.2: Commit**

```bash
git add src/hooks/usePlanStatus.ts
git commit -m "feat(billing): extend PlanStatus type with subscription_period_end and cancel_at_period_end"
```

---

### Task 11: Componente SubscriptionCard

**Files:**
- Create: `src/components/plan/SubscriptionCard.tsx`

- [ ] **Step 11.1: Crear el componente**

Crear `src/components/plan/SubscriptionCard.tsx`:

```tsx
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlanStatus, PLAN_LABELS } from "@/hooks/usePlanStatus";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function SubscriptionCard() {
  const { user } = useAuth();
  const { data: status, isLoading } = usePlanStatus();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);

  if (isLoading || !status || !user) return null;

  const hasSubscription = status.plan_id === 'basico' || status.plan_id === 'profesional';
  const isCanceling = status.subscription_cancel_at_period_end;
  const periodEnd = status.subscription_period_end
    ? format(new Date(status.subscription_period_end), "d 'de' MMMM 'de' yyyy", { locale: es })
    : null;

  const doCancel = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw new Error((error as { message?: string }).message ?? 'Error');
      await queryClient.invalidateQueries({ queryKey: ['plan_status', user.id] });
      toast.success("Suscripción cancelada. Seguirás teniendo acceso hasta el final del periodo.");
    } catch {
      toast.error("No se pudo cancelar la suscripción. Inténtalo de nuevo o contacta con soporte.");
    } finally {
      setBusy(false);
      setCancelDialogOpen(false);
    }
  };

  const doReactivate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('reactivate-subscription');
      if (error) throw new Error((error as { message?: string }).message ?? 'Error');
      await queryClient.invalidateQueries({ queryKey: ['plan_status', user.id] });
      toast.success("Suscripción reactivada. Se renovará automáticamente.");
    } catch {
      toast.error("No se pudo reactivar la suscripción. Inténtalo de nuevo o contacta con soporte.");
    } finally {
      setBusy(false);
      setReactivateDialogOpen(false);
    }
  };

  // Plan gratuito sin suscripción
  if (!hasSubscription) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Plan Gratuito</p>
              <p className="text-sm text-muted-foreground">2 firmas al mes incluidas</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/precios">Actualizar plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Plan {PLAN_LABELS[status.plan_id]}</p>
              {isCanceling && periodEnd ? (
                <p className="text-sm text-amber-600">
                  Finaliza el {periodEnd} · No se renovará
                </p>
              ) : periodEnd ? (
                <p className="text-sm text-muted-foreground">
                  Se renueva el {periodEnd}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Activo</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCanceling ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReactivateDialogOpen(true)}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reactivar suscripción
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelDialogOpen(true)}
                disabled={busy}
              >
                Cancelar suscripción
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de cancelación */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu plan seguirá activo
              {periodEnd ? ` hasta el ${periodEnd}` : ' hasta el final del periodo actual'}.
              Después pasarás automáticamente al plan Gratuito (2 firmas/mes).
              Los créditos de pack no caducan ni se eliminan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mantener suscripción</AlertDialogCancel>
            <AlertDialogAction
              onClick={doCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar suscripción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación de reactivación */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reactivar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu suscripción al Plan {PLAN_LABELS[status.plan_id]} se renovará automáticamente
              {periodEnd ? ` el ${periodEnd}` : ' al final del periodo'}. No se cobra nada ahora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={doReactivate} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reactivar suscripción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/components/plan/SubscriptionCard.tsx
git commit -m "feat(billing): add SubscriptionCard with cancel/reactivate dialogs"
```

---

### Task 12: Añadir SubscriptionCard a la página Credits

**Files:**
- Modify: `src/pages/Credits.tsx`

- [ ] **Step 12.1: Importar y añadir SubscriptionCard**

En `src/pages/Credits.tsx`:

Añadir import (junto a los existentes):
```typescript
import { SubscriptionCard } from "@/components/plan/SubscriptionCard";
```

Añadir el componente justo después del balance card y antes del primer `<Separator />`:
```tsx
<SubscriptionCard />
```

- [ ] **Step 12.2: Commit**

```bash
git add src/pages/Credits.tsx
git commit -m "feat(billing): add SubscriptionCard to Credits page"
```

---

## Chunk 4: n8n Workflow (configuración manual)

El workflow `firmaclara_billing` debe crearse manualmente en n8n (`https://n8n.operia.click`).
El trigger es el webhook que llama `triggerN8n()` desde el edge function `stripe-webhook`.

### Especificación del workflow

**Trigger:** Webhook
- Path: `firmaclara-billing`
- URL completa: `https://n8n.operia.click/webhook/firmaclara-billing`
- Auth: verificar header `X-FirmaClara-Signature` (HMAC-SHA256 con `N8N_WEBHOOK_SECRET`)

El payload que llega tiene la forma:
```json
{
  "event": "billing.checkout_completed",
  "data": {
    "payment_intent_id": "pi_xxx",
    "user_id": "uuid",
    "amount_cents": 900,
    "product_type": "plan_mensual",
    "plan_name": "Básico",
    "pack_quantity": "",
    "billing_profile": { "razon_social": "...", "nif_cif": "...", "regimen_fiscal": "IVA_ES", ... },
    "user_email": "user@ejemplo.com"
  },
  "timestamp": "2026-06-19T..."
}
```

**Nodos (en orden):**

**Nodo 1 — Webhook** (Trigger): recibe el POST con los datos anteriores.

**Nodo 2 — IF: idempotencia** (Supabase → SELECT invoices WHERE stripe_payment_intent_id = `{{ $json.data.payment_intent_id }}`). Si existe: STOP. Si no existe: continuar.

**Nodo 3 — Code: calcular importes**
```javascript
const d = $input.item.json.data;
const base = d.amount_cents / 100;
const ivaPct = d.billing_profile.regimen_fiscal === 'IGIC_IC' ? 7.00 : 21.00;
const impuesto = Math.round(base * ivaPct) / 100;
const now = new Date();
const mesAnio = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
const concepto = d.product_type === 'plan_mensual'
  ? `Suscripción FirmaClara Plan ${d.plan_name} – ${mesAnio}`
  : `Pack de firmas FirmaClara – ${d.pack_quantity} créditos`;
return [{ json: { ...d, base_imponible: base, iva_pct: ivaPct,
  importe_impuesto: impuesto, total: base + impuesto, concepto } }];
```

**Nodo 4 — Supabase INSERT invoices** (status: 'pending') con los campos calculados.

**Nodo 5 — HTTP GET: buscar contacto Holded**
- URL: `https://api.holded.com/api/invoicing/v1/contacts?name={{ $json.nif_cif }}`
- Auth: credencial "Holded API"

**Nodo 6 — IF: ¿contacto encontrado?** (buscar por campo `vatnumber === nif_cif`)
- SÍ: usar `contactId` del resultado
- NO: continuar a nodo 7

**Nodo 7 — HTTP POST: crear contacto Holded** (solo si no existe)
```json
{
  "name": "{{ billing_profile.razon_social }}",
  "vatnumber": "{{ billing_profile.nif_cif }}",
  "email": "{{ billing_profile.email_facturacion || user_email }}",
  "address": "{{ billing_profile.direccion_fiscal }}",
  "city": "{{ billing_profile.ciudad }}",
  "postalCode": "{{ billing_profile.codigo_postal }}",
  "country": "ES",
  "type": "client"
}
```

**Nodo 8 — HTTP POST: crear factura Holded** (serie FC)
```json
{
  "contactId": "{{ contactId }}",
  "docNumber": "",
  "serie": "FC",
  "date": "{{ Math.floor(Date.now() / 1000) }}",
  "items": [{ "name": "{{ concepto }}", "units": 1, "price": "{{ base_imponible }}", "tax": "{{ iva_pct }}" }]
}
```

**Nodo 9 — HTTP POST: enviar factura por email**
```
POST https://api.holded.com/api/invoicing/v1/documents/invoice/{{ holded_invoice_id }}/send
{ "emails": ["{{ email_facturacion || user_email }}"], "bcc": ["facturacion@operiatech.es"] }
```

**Nodo 10 — Supabase PATCH invoices**: actualizar `holded_invoice_id`, `numero_fc`, `holded_status: 'sent'`.

**Nodo Error** (en cualquier nodo 5-10):
- Supabase PATCH invoices: `holded_status: 'error'`, `error_detail: <mensaje>`
- Enviar email de alerta a `jordi@operiatech.es` con datos del pago

---

## Testing checklist

- [ ] Tablas `billing_profiles` e `invoices` existen en Supabase → Table Editor
- [ ] Columnas `subscription_period_end` y `subscription_cancel_at_period_end` en `users`
- [ ] `get_plan_status()` devuelve los dos campos nuevos
- [ ] Modal de facturación: click "Contratar" sin perfil → modal aparece
- [ ] Modal de facturación: formulario con CP canario (35xxx) → `regimen_fiscal: 'IGIC_IC'`
- [ ] Modal de facturación: país ≠ ES → aviso visible, botón deshabilitado
- [ ] Modal de facturación: usuario ya tiene perfil → modal prefilled, puede ir directo
- [ ] Cancelar suscripción: usuario con plan activo → dialogo → `cancel_at_period_end: true` en Stripe y DB
- [ ] Reactivar suscripción: usuario en estado canceling → dialogo → `cancel_at_period_end: false`
- [ ] UI `SubscriptionCard`: muestra "Finaliza el [fecha]" cuando `subscription_cancel_at_period_end = true`
- [ ] n8n workflow: test con payload de prueba → registro en `invoices` + factura en Holded sandbox

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/20260619_billing_tables.sql` | Crear |
| `supabase/migrations/20260619_subscription_period.sql` | Crear |
| `supabase/functions/stripe-webhook/index.ts` | Modificar |
| `supabase/functions/create-plan-checkout/index.ts` | Modificar |
| `supabase/functions/cancel-subscription/index.ts` | Crear |
| `supabase/functions/cancel-subscription/deno.json` | Crear |
| `supabase/functions/reactivate-subscription/index.ts` | Crear |
| `supabase/functions/reactivate-subscription/deno.json` | Crear |
| `src/hooks/useBillingProfile.ts` | Crear |
| `src/hooks/usePlanStatus.ts` | Modificar |
| `src/components/billing/BillingProfileModal.tsx` | Crear |
| `src/components/plan/SubscriptionCard.tsx` | Crear |
| `src/lib/billing.ts` | Modificar |
| `src/pages/Precios.tsx` | Modificar |
| `src/pages/Credits.tsx` | Modificar |
