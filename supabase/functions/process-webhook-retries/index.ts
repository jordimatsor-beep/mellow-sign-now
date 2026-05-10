/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MAX_ATTEMPTS = 5
const MAX_EVENTS_PER_RUN = 10

serve(async (req: Request) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const nowIso = new Date().toISOString()
    const { data: failedEvents, error } = await supabaseAdmin
      .from('webhook_events')
      .select('id, event_id, event_type, payload, attempts')
      .eq('status', 'failed')
      .lte('next_retry_at', nowIso)
      .lt('attempts', MAX_ATTEMPTS)
      .limit(MAX_EVENTS_PER_RUN)

    if (error) {
      console.error('Unable to fetch failed webhook events:', error.message)
      return jsonResponse({ processed: 0, error: 'Failed to query webhook_events' })
    }

    const events = failedEvents ?? []
    let processed = 0
    let errors = 0

    for (const eventRow of events) {
      try {
        await processWebhookEvent(supabaseAdmin, eventRow)
        processed += 1
      } catch (err) {
        errors += 1
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Retry worker failed for event ${eventRow.event_id}:`, message)
      }
    }

    return jsonResponse({ processed, errors })
  } catch (err) {
    console.error('process-webhook-retries handler error:', err)
    return jsonResponse({ processed: 0, error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function processWebhookEvent(
  supabaseAdmin: SupabaseClient,
  eventRow: { id: string; event_id: string; event_type: string; payload: unknown; attempts: number | null }
) {
  const event = eventRow.payload as Record<string, unknown> | null
  if (!event || typeof event !== 'object' || !event.id || !event.type) {
    await markEventDead(supabaseAdmin, eventRow.event_id, 'Malformed payload stored in webhook_events')
    return
  }

  if (event.type !== 'checkout.session.completed') {
    await markEventProcessed(supabaseAdmin, eventRow.event_id)
    return
  }

  try {
    await handleCheckoutSessionCompleted(supabaseAdmin, event)
    await markEventProcessed(supabaseAdmin, eventRow.event_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Retry worker processing event ${eventRow.event_id}: ${message}`)
    await markEventFailed(supabaseAdmin, eventRow.event_id, eventRow.attempts ?? 0, message)
  }
}

async function handleCheckoutSessionCompleted(supabaseAdmin: SupabaseClient, event: Record<string, unknown>) {
  const session = getObject(event, ['data', 'object'])
  const metadata = getObject(session, ['metadata']) ?? {}
  const userId = getString(metadata, ['user_id'])
  const packType = getString(metadata, ['pack_id'])
  const credits = getInteger(metadata, ['credits'])
  const paymentIntent = getString(session, ['payment_intent'])
  const sessionId = getString(session, ['id'])
  const amountTotal = getInteger(session, ['amount_total'], { allowNull: true })

  if (!userId || !packType || credits === null || !paymentIntent || !sessionId) {
    throw new Error('Incomplete Stripe session metadata; cannot process purchase')
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

  await insertTransactionIfMissing(supabaseAdmin, {
    user_id: userId,
    type: 'purchase',
    amount: credits,
    description: `Compra de pack ${packType.toUpperCase()} (${credits} créditos)`,
    credit_pack_id: purchaseId
  })
}

async function upsertUserCreditPurchase(supabaseAdmin: SupabaseClient, purchase: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('user_credit_purchases')
    .upsert(purchase, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(`Could not upsert user_credit_purchases: ${error.message}`)
  }

  if (data && typeof data.id === 'string') {
    return data.id
  }

  const paymentIntent = String(purchase.stripe_payment_id ?? '')
  if (!paymentIntent) {
    throw new Error('Stripe payment ID missing after upsert')
  }

  const { data: existingPurchase, error: lookupError } = await supabaseAdmin
    .from('user_credit_purchases')
    .select('id')
    .eq('stripe_payment_id', paymentIntent)
    .single()

  if (lookupError || !existingPurchase) {
    throw new Error(`Unable to retrieve user_credit_purchases row after upsert: ${lookupError?.message ?? 'no row'}`)
  }

  return existingPurchase.id
}

async function insertTransactionIfMissing(supabaseAdmin: SupabaseClient, transaction: Record<string, unknown>) {
  const packId = String(transaction.credit_pack_id ?? '')
  if (!packId) {
    throw new Error('credit_pack_id is required for transaction deduplication')
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('credit_pack_id', packId)
    .eq('type', 'purchase')
    .maybeSingle()

  if (existingError) {
    throw new Error(`Could not query credit_transactions: ${existingError.message}`)
  }

  if (existing) {
    return
  }

  const { error } = await supabaseAdmin
    .from('credit_transactions')
    .insert([transaction])

  if (error) {
    throw new Error(`Could not insert credit_transactions: ${error.message}`)
  }
}

async function markEventProcessed(supabaseAdmin: SupabaseClient, eventId: string) {
  await supabaseAdmin
    .from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString(), last_attempt_at: new Date().toISOString(), next_retry_at: null, error_message: null })
    .eq('event_id', eventId)
}

async function markEventDead(supabaseAdmin: SupabaseClient, eventId: string, errorMessage: string) {
  await supabaseAdmin
    .from('webhook_events')
    .update({ status: 'dead', attempts: MAX_ATTEMPTS, last_attempt_at: new Date().toISOString(), next_retry_at: null, error_message: errorMessage })
    .eq('event_id', eventId)
}

async function markEventFailed(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  currentAttempts: number,
  errorMessage: string
) {
  const nextAttempt = currentAttempts + 1
  const delayMinutes = Math.min(2 ** nextAttempt, 1440)
  const nextRetryAt = new Date(Date.now() + delayMinutes * 60_000).toISOString()
  const status = nextAttempt >= MAX_ATTEMPTS ? 'dead' : 'failed'

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

function getObject(source: Record<string, unknown> | null | undefined, path: string[]) {
  let current: unknown = source
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return null
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current as Record<string, unknown> | null
}

function getString(source: Record<string, unknown> | null | undefined, path: string[], options?: { allowNull?: boolean }) {
  const value = getObject(source, path)
  if (value === null || value === undefined) {
    return options?.allowNull ? null : ''
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return ''
}

function getInteger(source: Record<string, unknown> | null | undefined, path: string[], options?: { allowNull?: boolean }) {
  const raw = getObject(source, path)
  if (raw === null || raw === undefined) {
    return options?.allowNull ? null : null
  }
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}
