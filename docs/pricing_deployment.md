# Despliegue · Nueva política de precios (planes + overage)

Implementación del PRD `PRD_pricing_implementation.md` adaptada al stack real de
FirmaClara (Vite + React + Supabase Edge Functions; tabla `users`; sin Next.js).

> ⚠️ **Toca facturación real.** Haz primero todo en **modo TEST de Stripe** y un
> entorno/branch de Supabase. No apliques nada directo a producción sin probar el
> flujo completo de §5 (test E2E) del PRD.

---

## Qué se ha construido

| Capa | Archivo | Qué hace |
|------|---------|----------|
| DB | `supabase/migrations/20260612130000_pricing_plans.sql` | Columnas de plan en `users`, tablas `overage_charges` y `plan_history`, núcleo `consumir_firma`, `revertir_firma`, `get_plan_status`, `reset_firmas_mensuales`, `add_firmas_creditos`, migración de saldos y `handle_new_user` (nuevos usuarios → Gratis 2/mes). |
| DB cron | `scripts/db/cron_reset_firmas.sql` | Reset mensual de la cuota del plan **Gratis** (día 1). Los de pago se resetean en su ciclo de Stripe. |
| Stripe | `scripts/stripe/setup_products.mjs` | Crea (idempotente) los productos/precios y devuelve los `price_id`. |
| Edge | `supabase/functions/stripe-webhook/index.ts` | Suscripciones (alta/cambio/baja), reset de ciclo y **facturación de overage** vía invoice items. |
| Edge | `supabase/functions/create-plan-checkout/index.ts` | Checkout de suscripción (Básico/Profesional) y pack puntual. Exige consentimiento de overage en Profesional. |
| Edge | `supabase/functions/stripe-portal/index.ts` | Portal de Cliente de Stripe. |
| Edge | `supabase/functions/send-invite-v2/index.ts` | Ahora consume vía `consumir_firma` y devuelve `402 limite_alcanzado` con plan + límite. |
| Front | `src/pages/Precios.tsx` (`/precios`) | Página de 4 planes + consentimiento de overage + portal. |
| Front | `src/components/plan/*`, `src/hooks/usePlanStatus.ts`, `src/lib/billing.ts` | Bloque de uso en dashboard, banner de overage, modal de límite, aviso de impago. |

**Modelo de consumo** (orden, en `consumir_firma`): 1) crédito de pack
(`users.firmas_creditos`), 2) cuota mensual del plan, 3) overage (solo
Profesional al corriente de pago), 4) bloqueo. `consume_credit` /
`consume_credit_for_user` / `refund_credit` se conservan como envoltorios que
delegan en el núcleo nuevo → ningún punto de llamada existente se rompe.

---

## Orden de despliegue

### 1. Stripe — crear productos (modo TEST primero)
```powershell
npm i stripe                         # dependencia solo para el script
$env:STRIPE_SECRET_KEY = "sk_test_..."
node scripts/stripe/setup_products.mjs
```
Copia el bloque de `price_id` que imprime.

### 2. Variables de entorno (Supabase → Edge Functions → Manage secrets)
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...      # se obtiene al crear el webhook (paso 5)
STRIPE_PRICE_BASICO=price_...
STRIPE_PRICE_PROFESIONAL=price_...
STRIPE_PRICE_PACK=price_...
STRIPE_PRICE_OVERAGE=price_...       # informativo (el overage se cobra por importe)
APP_URL=https://www.firmaclara.es
```

### 3. Base de datos — **SQL Editor, NO `db push`**
> El historial de migraciones de FirmaClara está desincronizado y `supabase db
> push` **está roto**. Aplica el SQL **pegándolo en el SQL Editor** del
> dashboard (proyecto `pmzfwwtgjvlvuawxguiw`), como se ha hecho siempre. La
> migración es idempotente (`CREATE OR REPLACE` / `IF NOT EXISTS`), así que es
> segura aunque algún objeto ya exista.

1. Pega `supabase/migrations/20260612130000_pricing_plans.sql` en el SQL Editor y ejecútalo.
2. Pega `scripts/db/cron_reset_firmas.sql` (programa el cron del reset Gratis).
3. (Recomendado) Regenera los tipos TS:
   `supabase gen types typescript --project-id pmzfwwtgjvlvuawxguiw > src/integrations/supabase/types.ts`.

### 4. Desplegar Edge Functions (sin Docker, vía API)
```powershell
./scripts/deploy_functions.ps1
# despliega con --use-api --project-ref pmzfwwtgjvlvuawxguiw
# incluye: stripe-webhook, create-plan-checkout, stripe-portal, send-invite-v2
```

### 5. Webhook de Stripe
Crea un endpoint → función `stripe-webhook` con estos eventos:
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_succeeded`,
`invoice.payment_failed`. Copia el `whsec_...` a `STRIPE_WEBHOOK_SECRET` (paso 2).

### 6. Portal de Cliente + Smart Retries
- Activa el Portal: `Settings → Billing → Customer portal` (permitir cambio de
  plan entre Básico/Profesional, cancelar, actualizar método de pago).
- Smart Retries: `Settings → Billing → Subscriptions` (3 intentos).

### 7. Prueba E2E (modo TEST) — PRD §5 fase 5
Usuario nuevo → Gratis → usa 2 → bloqueo/modal → compra pack → usa pack →
contrata Básico → usa 10 → bloqueo → upgrade Profesional → supera 50 →
overage registrado → simula `invoice.payment_succeeded` (reset + invoice item de
overage) → simula `invoice.payment_failed` (past_due + gracia) → cancela en
Portal (`subscription.deleted` → Gratis).

---

## Mapa de criterios de aceptación (PRD §11)

| # | Criterio | Dónde |
|---|----------|-------|
| 1-3 | Gratis/Básico bloquean al límite | `consumir_firma` (4) + `send-invite-v2` 402 |
| 4 | Profesional permite overage y lo registra | `consumir_firma` (3) + `overage_charges` |
| 5 | Pack se consume antes que la cuota | `consumir_firma` orden 1→2 |
| 6 | Cambio de plan < 10 s tras webhook | `stripe-webhook` handlers + `plan_history` |
| 7 | Cancelar → Gratis automático | `handleSubscriptionDeleted` |
| 8 | Reset día 1 (Gratis) / ciclo (pago) | `reset_firmas_mensuales` + `invoice.payment_succeeded` |
| 9 | Sin estado “envío no contabilizado” | núcleo único `consumir_firma` |
| 10 | Overage solo Profesional | `consumir_firma` (3) usa plan efectivo |

---

## Desviaciones conscientes respecto al PRD

1. **Reset por cron solo para Gratis.** Los planes de pago se resetean en su
   ciclo real de Stripe (`invoice.payment_succeeded`), no el día 1, para no
   regalar cuota a mitad de ciclo. (PRD §4.5 reseteaba los tres.)
2. **Impago: no se muta `plan_id`.** En `past_due` + gracia vencida, el usuario
   consume como Gratis (plan *efectivo*); al pagar recupera su plan solo. Evita
   downgrades destructivos e irreversibles.
3. **`firmas_creditos` vive como saldo en `users`** (modelo literal del PRD); el
   antiguo ledger FIFO `user_credit_purchases` se neutraliza y queda solo como
   histórico. La migración vuelca cada saldo sin que nadie pierda créditos (§8).
