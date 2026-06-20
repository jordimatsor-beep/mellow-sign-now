/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.10.0"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { triggerN8n } from '../_shared/n8n.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Price IDs de los planes (creados con scripts/stripe/setup_products.mjs)
const STRIPE_PRICE_BASICO = Deno.env.get('STRIPE_PRICE_BASICO') ?? ''
const STRIPE_PRICE_PROFESIONAL = Deno.env.get('STRIPE_PRICE_PROFESIONAL') ?? ''

const OVERAGE_UNIT_AMOUNT = 40 // 0,40 € por firma extra, en céntimos

// Mapea un price_id de Stripe al plan_id interno.
function planFromPriceId(priceId: string): 'basico' | 'profesional' | null {
  if (priceId && priceId === STRIPE_PRICE_BASICO) return 'basico'
  if (priceId && priceId === STRIPE_PRICE_PROFESIONAL) return 'profesional'
  return null
}

const PLAN_RANK: Record<string, number> = { gratis: 0, basico: 1, profesional: 2 }

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const signature = req.headers.get('Stripe-Signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.text()
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient()
    })

    let event: Record<string, unknown>
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET) as Record<string, unknown>
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook verification failed'
      console.error(`Stripe webhook verification failed: ${message}`)
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const eventId = String(event.id ?? '')
    const eventType = String(event.type ?? '')

    if (!eventId || !eventType) {
      throw new Error('Invalid Stripe event payload')
    }

    const webhookEventRow = await ensureWebhookEvent(supabaseAdmin, eventId, eventType, event)
    if (!webhookEventRow) {
      throw new Error('Unable to create or fetch webhook event record')
    }

    if (webhookEventRow.status === 'processed' || webhookEventRow.status === 'dead') {
      return successResponse()
    }

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(supabaseAdmin, event, eventId)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(supabaseAdmin, event, eventId)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(supabaseAdmin, event, eventId)
          break
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(supabaseAdmin, stripe, event)
          break
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(supabaseAdmin, event, eventId)
          break
        default:
          // Evento no manejado: lo marcamos procesado igualmente (idempotencia).
          break
      }

      await updateWebhookEventProcessed(supabaseAdmin, eventId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error'
      console.error(`Stripe webhook processing failed for event ${eventId}:`, message)
      await updateWebhookEventFailed(supabaseAdmin, eventId, webhookEventRow.attempts ?? 0, message)
    }

    return successResponse()
  } catch (error) {
    console.error('stripe-webhook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function successResponse() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function ensureWebhookEvent(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  eventType: string,
  payload: unknown
) {
  const nowIso = new Date().toISOString()
  const insertPayload = {
    event_id: eventId,
    event_type: eventType,
    payload,
    status: 'pending',
    attempts: 0,
    last_attempt_at: nowIso,
    next_retry_at: null,
    error_message: null as string | null,
    processed_at: null as string | null
  }

  const insertResult = await supabaseAdmin
    .from('webhook_events')
    .insert(insertPayload, { ignoreDuplicates: true })
    .select('id, status, attempts')
    .maybeSingle()

  if (insertResult.error) {
    throw new Error(`Unable to insert webhook event: ${insertResult.error.message}`)
  }

  if (insertResult.data) {
    return insertResult.data
  }

  const fetchResult = await supabaseAdmin
    .from('webhook_events')
    .select('id, status, attempts')
    .eq('event_id', eventId)
    .maybeSingle()

  if (fetchResult.error) {
    throw new Error(`Unable to query existing webhook event: ${fetchResult.error.message}`)
  }

  if (!fetchResult.data) {
    throw new Error('Webhook event row missing after duplicate insert fallback')
  }

  if (fetchResult.data.status === 'processed' || fetchResult.data.status === 'dead' || (fetchResult.data.attempts ?? 0) >= 5) {
    return fetchResult.data
  }

  const updateResult = await supabaseAdmin
    .from('webhook_events')
    .update({
      event_type: eventType,
      payload,
      status: 'pending',
      last_attempt_at: nowIso,
      next_retry_at: null,
      error_message: null
    })
    .eq('event_id', eventId)

  if (updateResult.error) {
    throw new Error(`Unable to refresh webhook event state: ${updateResult.error.message}`)
  }

  return { id: fetchResult.data.id, status: 'pending', attempts: fetchResult.data.attempts }
}

async function handleCheckoutSessionCompleted(
  supabaseAdmin: SupabaseClient,
  event: Record<string, unknown>,
  eventId: string
) {
  const session = getNestedObject(event, ['data', 'object'])
  const metadata = getNestedObject(session, ['metadata']) ?? {}
  const userId = getNestedString(metadata, ['user_id'])
  const planId = getNestedString(metadata, ['plan_id'])
  const mode = getNestedString(session, ['mode'])
  const customerId = getNestedString(session, ['customer'])
  const subscriptionId = getNestedString(session, ['subscription'])
  const sessionId = getNestedString(session, ['id'])

  if (!userId) {
    throw new Error('Invalid checkout metadata: missing user_id')
  }

  // Guarda el customer de Stripe en el usuario (necesario para el portal y overage).
  if (customerId) {
    await supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
  }

  // ── Suscripción (Básico / Profesional) ───────────────────────────────
  if (mode === 'subscription' && (planId === 'basico' || planId === 'profesional')) {
    const prevPlan = await getUserPlan(supabaseAdmin, userId)
    const { error } = await supabaseAdmin.from('users').update({
      plan_id: planId,
      stripe_subscription_id: subscriptionId || null,
      subscription_status: 'active',
      firmas_usadas_mes: 0,
      plan_renewed_at: new Date().toISOString(),
      grace_until: null,
    }).eq('id', userId)
    if (error) throw new Error(`Failed to activate subscription: ${error.message}`)

    await insertPlanHistory(supabaseAdmin, userId, prevPlan, planId,
      motiveForChange(prevPlan, planId), eventId)
  }

  // ── Pago único: pack puntual de firmas ───────────────────────────────
  else if (mode === 'payment') {
    const credits = getNestedInteger(metadata, ['credits']) ?? (planId === 'pack_puntual' ? 15 : null)
    if (credits === null || credits <= 0) {
      throw new Error('Invalid pack checkout: missing/invalid credits metadata')
    }
    const { error } = await supabaseAdmin.rpc('add_firmas_creditos', {
      p_user_id: userId,
      p_credits: credits,
      p_session: sessionId,
      p_description: `Compra de pack de ${credits} firmas`,
    })
    if (error) throw new Error(`Failed to add pack credits: ${error.message}`)
  }

  // Modo no contemplado: no hacemos nada (idempotencia). Para subscription y payment,
  // disparar n8n para generación de factura en Holded (non-fatal).
  if (mode === 'subscription' || mode === 'payment') {
    const paymentIntentId = getNestedString(session, ['payment_intent']) || sessionId
    const amountCents = Number(getNestedObject(session, ['amount_total']) ?? 0)
    triggerN8nBilling(supabaseAdmin, userId, paymentIntentId, amountCents, metadata as Record<string, unknown>)
      .catch((e) => console.error('triggerN8nBilling non-fatal:', e instanceof Error ? e.message : e))

    // Comisión de afiliado: 20% al referrer si este usuario fue referido (non-fatal)
    if (amountCents > 0 && sessionId) {
      handleAffiliateCommission(supabaseAdmin, userId, amountCents, planId || 'pack_puntual', sessionId)
        .catch((e) => console.error('handleAffiliateCommission non-fatal:', e instanceof Error ? e.message : e))
    }
  }
}

async function handleAffiliateCommission(
  supabaseAdmin: SupabaseClient,
  buyerUserId: string,
  amountCents: number,
  product: string,
  stripeSession: string
) {
  // Buscar si el comprador fue referido por alguien
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('referrer_id')
    .eq('referred_id', buyerUserId)
    .neq('status', 'invalid')
    .maybeSingle()

  if (!referral?.referrer_id) return

  const purchaseEur = amountCents / 100
  const commissionEur = Math.round(purchaseEur * 20) / 100 // 20%, redondeado a céntimos

  // UNIQUE en stripe_session garantiza idempotencia
  await supabaseAdmin.from('referral_commissions').insert({
    referrer_id:   referral.referrer_id,
    referred_id:   buyerUserId,
    amount_eur:    commissionEur,
    percentage:    20,
    purchase_eur:  purchaseEur,
    product,
    stripe_session: stripeSession,
    status: 'pending',
  }).throwOnError()
}

async function triggerN8nBilling(
  supabaseAdmin: SupabaseClient,
  userId: string,
  paymentIntentId: string,
  amountCents: number,
  metadata: Record<string, unknown>
) {
  const { data: billingProfile } = await supabaseAdmin
    .from('billing_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!billingProfile) {
    // Sin perfil fiscal no se puede generar factura — no es un error de plataforma.
    console.warn(`triggerN8nBilling: no billing_profile for user ${userId} — invoice skipped`)
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

// ── customer.subscription.created / updated ────────────────────────────
// Upgrade / downgrade desde el Portal de Cliente de Stripe, o nueva suscripción.
async function handleSubscriptionUpdated(
  supabaseAdmin: SupabaseClient,
  event: Record<string, unknown>,
  eventId: string
) {
  const sub = getNestedObject(event, ['data', 'object'])
  const customerId = getNestedString(sub, ['customer'])
  const subscriptionId = getNestedString(sub, ['id'])
  const status = getNestedString(sub, ['status']) // active, past_due, canceled, trialing...
  const priceId = getNestedString(sub, ['items', 'data', '0', 'price', 'id'])
  const cancelAtPeriodEnd = getNestedObject(sub, ['cancel_at_period_end']) === true
  const currentPeriodEndRaw = getNestedObject(sub, ['current_period_end'])

  const newPlan = planFromPriceId(priceId)
  const user = customerId ? await findUserByCustomer(supabaseAdmin, customerId) : null
  if (!user) {
    // Sin usuario asociado no podemos hacer nada útil; no es un error fatal.
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
  // Si la suscripción se programó para cancelar al final del ciclo, mantenemos
  // el plan hasta que llegue subscription.deleted; solo reflejamos el estado.
  if (newPlan && !cancelAtPeriodEnd) {
    update.plan_id = newPlan
  }
  if (subStatus === 'active') {
    update.grace_until = null
  }

  const { error } = await supabaseAdmin.from('users').update(update).eq('id', user.id)
  if (error) throw new Error(`Failed to update subscription: ${error.message}`)

  // Historial solo si cambió el plan (no en downgrade reseteamos firmas: se respeta lo usado).
  if (newPlan && newPlan !== prevPlan && !cancelAtPeriodEnd) {
    await insertPlanHistory(supabaseAdmin, user.id, prevPlan, newPlan,
      motiveForChange(prevPlan, newPlan), eventId)
  }
}

// ── customer.subscription.deleted ──────────────────────────────────────
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

// ── invoice.payment_succeeded ──────────────────────────────────────────
// Renovación mensual: resetea la cuota y factura el overage acumulado.
async function handleInvoicePaymentSucceeded(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  event: Record<string, unknown>
) {
  const invoice = getNestedObject(event, ['data', 'object'])
  const customerId = getNestedString(invoice, ['customer'])
  const billingReason = getNestedString(invoice, ['billing_reason'])
  const user = customerId ? await findUserByCustomer(supabaseAdmin, customerId) : null
  if (!user) {
    console.warn(`invoice.payment_succeeded: no user for customer ${customerId}`)
    return
  }

  // Reset del contador solo en la renovación de ciclo (no en la primera factura).
  if (billingReason === 'subscription_cycle' || billingReason === 'subscription_create') {
    await supabaseAdmin.from('users').update({
      firmas_usadas_mes: 0,
      plan_renewed_at: new Date().toISOString(),
      subscription_status: 'active',
      grace_until: null,
    }).eq('id', user.id)
  }

  // Facturar el overage pendiente del ciclo cerrado (solo Profesional lo genera).
  await billPendingOverage(supabaseAdmin, stripe, user.id, customerId)
}

// ── invoice.payment_failed ─────────────────────────────────────────────
async function handleInvoicePaymentFailed(
  supabaseAdmin: SupabaseClient,
  event: Record<string, unknown>,
  eventId: string
) {
  const invoice = getNestedObject(event, ['data', 'object'])
  const customerId = getNestedString(invoice, ['customer'])
  const user = customerId ? await findUserByCustomer(supabaseAdmin, customerId) : null
  if (!user) {
    console.warn(`invoice.payment_failed: no user for customer ${customerId}`)
    return
  }

  // Periodo de gracia de 3 días antes de bajar a Gratis (lo aplica un cron/login check).
  const graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabaseAdmin.from('users').update({
    subscription_status: 'past_due',
    grace_until: graceUntil,
  }).eq('id', user.id)
  if (error) throw new Error(`Failed to mark past_due: ${error.message}`)

  await insertPlanHistory(supabaseAdmin, user.id, user.plan_id ?? 'gratis',
    user.plan_id ?? 'gratis', 'pago_fallido', eventId)
}

// ── Helpers de plan / overage ──────────────────────────────────────────

async function getUserPlan(supabaseAdmin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('users').select('plan_id').eq('id', userId).maybeSingle()
  return (data?.plan_id as string) ?? 'gratis'
}

async function findUserByCustomer(supabaseAdmin: SupabaseClient, customerId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, plan_id, stripe_subscription_id, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data as { id: string; plan_id: string; stripe_subscription_id: string | null; stripe_customer_id: string | null } | null
}

function mapSubStatus(status: string): string {
  switch (status) {
    case 'active': return 'active'
    case 'trialing': return 'trialing'
    case 'past_due':
    case 'unpaid': return 'past_due'
    case 'canceled':
    case 'incomplete_expired': return 'canceled'
    default: return 'active'
  }
}

function motiveForChange(prev: string, next: string): string {
  const a = PLAN_RANK[prev] ?? 0
  const b = PLAN_RANK[next] ?? 0
  if (b > a) return 'upgrade'
  if (b < a) return 'downgrade'
  return 'renewal'
}

async function insertPlanHistory(
  supabaseAdmin: SupabaseClient,
  userId: string,
  prevPlan: string,
  newPlan: string,
  motivo: string,
  eventId: string
) {
  // Idempotencia: no duplicar el mismo evento de Stripe.
  const existing = await supabaseAdmin
    .from('plan_history')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle()
  if (existing.data) return

  const { error } = await supabaseAdmin.from('plan_history').insert({
    user_id: userId,
    plan_anterior: prevPlan,
    plan_nuevo: newPlan,
    motivo,
    stripe_event_id: eventId,
  })
  if (error) console.error(`Failed to insert plan_history: ${error.message}`)
}

// Factura el overage pendiente creando un invoice item por lote.
async function billPendingOverage(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  userId: string,
  customerId: string
) {
  // 1) Lee las firmas extra pendientes de facturar.
  const { data: pending, error } = await supabaseAdmin
    .from('overage_charges')
    .select('id')
    .eq('user_id', userId)
    .eq('billed', false)

  if (error) {
    console.error(`Failed to read pending overage: ${error.message}`)
    return
  }
  if (!pending || pending.length === 0) return

  const ids = pending.map((r: { id: string }) => r.id)
  const qty = ids.length
  const amount = qty * OVERAGE_UNIT_AMOUNT

  // 2) "Reclama" las filas marcándolas billed=true ANTES de cobrar, para que un
  //    fallo posterior de DB no provoque un doble cargo en el siguiente ciclo.
  const { error: claimErr } = await supabaseAdmin
    .from('overage_charges')
    .update({ billed: true })
    .in('id', ids)
    .eq('billed', false)
  if (claimErr) {
    console.error(`Failed to claim overage rows: ${claimErr.message}`)
    return // sin reclamar no cobramos; se reintenta en la próxima renovación
  }

  // 3) Crea el invoice item. Si falla, revertimos la reclama para reintentar.
  let invoiceItemId = ''
  try {
    const item = await stripe.invoiceItems.create({
      customer: customerId,
      currency: 'eur',
      amount,
      description: `Firmas adicionales FirmaClara (${qty} × 0,40 €)`,
    })
    invoiceItemId = item.id
  } catch (e) {
    console.error('Failed to create overage invoice item, reverting claim:', e instanceof Error ? e.message : e)
    await supabaseAdmin.from('overage_charges').update({ billed: false }).in('id', ids)
    return
  }

  // 4) Estampa la referencia del item (best-effort; ya están billed=true).
  const { error: stampErr } = await supabaseAdmin
    .from('overage_charges')
    .update({ stripe_invoice_item_id: invoiceItemId })
    .in('id', ids)
  if (stampErr) console.error(`Overage billed but failed to stamp invoice item id: ${stampErr.message}`)
}

async function updateWebhookEventProcessed(supabaseAdmin: SupabaseClient, eventId: string) {
  await supabaseAdmin
    .from('webhook_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      next_retry_at: null,
      error_message: null
    })
    .eq('event_id', eventId)
}

async function updateWebhookEventFailed(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  currentAttempts: number,
  errorMessage: string
) {
  const nextAttempt = currentAttempts + 1
  const delayMinutes = Math.min(2 ** nextAttempt, 1440)
  const nextRetryAt = new Date(Date.now() + delayMinutes * 60_000).toISOString()
  const status = nextAttempt >= 5 ? 'dead' : 'failed'

  await supabaseAdmin
    .from('webhook_events')
    .update({
      status,
      attempts: nextAttempt,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: status === 'dead' ? null : nextRetryAt,
      error_message: errorMessage
    })
    .eq('event_id', eventId)
}

function getNestedObject(source: unknown, path: string[]) {
  if (!source || typeof source !== 'object') {
    return null
  }

  let current: unknown = source
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current as Record<string, unknown> | null
}

function getNestedString(source: unknown, path: string[]) {
  const value = getNestedObject(source, path)
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return ''
}

function getNestedInteger(source: unknown, path: string[], options?: { allowNull?: boolean }) {
  const value = getNestedObject(source, path)
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  return null
}
