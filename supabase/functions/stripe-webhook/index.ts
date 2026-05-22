/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.10.0"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
      if (eventType === 'checkout.session.completed') {
        await handleCheckoutSessionCompleted(supabaseAdmin, event)
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

async function handleCheckoutSessionCompleted(supabaseAdmin: SupabaseClient, event: Record<string, unknown>) {
  const session = getNestedObject(event, ['data', 'object'])
  const metadata = getNestedObject(session, ['metadata']) ?? {}
  const userId = getNestedString(metadata, ['user_id'])
  const packType = getNestedString(metadata, ['pack_id'])
  const credits = getNestedInteger(metadata, ['credits'])
  const paymentIntent = getNestedString(session, ['payment_intent'])
  const sessionId = getNestedString(session, ['id'])
  const amountTotal = getNestedInteger(session, ['amount_total'], { allowNull: true })

  if (!userId || !packType || credits === null || credits <= 0 || !paymentIntent || !sessionId) {
    throw new Error('Invalid checkout metadata: missing user_id, pack_id, credits, payment_intent or session id')
  }

  const purchaseId = await upsertUserCreditPurchase(supabaseAdmin, {
    user_id: userId,
    pack_type: packType,
    credits_total: credits,
    credits_used: 0,
    price_paid: amountTotal !== null ? amountTotal / 100 : 0,
    stripe_payment_id: paymentIntent,
    stripe_session_id: sessionId,
    purchased_at: new Date().toISOString()
  })

  await insertCreditTransactionIfMissing(supabaseAdmin, {
    user_id: userId,
    type: 'purchase',
    amount: credits,
    description: `Compra de pack ${packType.toUpperCase()} (${credits} créditos)`,
    credit_pack_id: purchaseId
  })
}

async function upsertUserCreditPurchase(supabaseAdmin: SupabaseClient, purchase: Record<string, unknown>) {
  const upsertResult = await supabaseAdmin
    .from('user_credit_purchases')
    .upsert(purchase, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (upsertResult.error) {
    throw new Error(`Failed to upsert user_credit_purchases: ${upsertResult.error.message}`)
  }

  if (upsertResult.data && typeof upsertResult.data.id === 'string') {
    return upsertResult.data.id
  }

  const paymentIntent = String(purchase.stripe_payment_id ?? '')
  if (!paymentIntent) {
    throw new Error('Missing stripe_payment_id after purchase upsert')
  }

  const lookup = await supabaseAdmin
    .from('user_credit_purchases')
    .select('id')
    .eq('stripe_payment_id', paymentIntent)
    .single()

  if (lookup.error || !lookup.data) {
    throw new Error(`Unable to fetch user_credit_purchases after upsert: ${lookup.error?.message ?? 'not found'}`)
  }

  return lookup.data.id
}

async function insertCreditTransactionIfMissing(supabaseAdmin: SupabaseClient, transaction: Record<string, unknown>) {
  const packId = String(transaction.credit_pack_id ?? '')
  if (!packId) {
    throw new Error('credit_pack_id is required for credit transaction deduplication')
  }

  const existing = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('credit_pack_id', packId)
    .eq('type', 'purchase')
    .maybeSingle()

  if (existing.error) {
    throw new Error(`Failed to query existing credit transaction: ${existing.error.message}`)
  }

  if (existing.data) {
    return
  }

  const insertResult = await supabaseAdmin
    .from('credit_transactions')
    .insert([transaction])

  if (insertResult.error) {
    throw new Error(`Failed to insert credit transaction: ${insertResult.error.message}`)
  }
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
    return options?.allowNull ? null : null
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
