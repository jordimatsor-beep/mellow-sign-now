/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cancela la suscripción al final del periodo actual (cancel_at_period_end: true).
// El usuario mantiene acceso hasta que venza el ciclo ya pagado.

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

    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    // Refleja el estado inmediatamente (el webhook lo confirma de forma asíncrona).
    await supabaseAdmin.from('users').update({
      subscription_cancel_at_period_end: true,
      subscription_period_end: periodEnd,
    }).eq('id', user.id)

    return json({ ok: true, period_end: periodEnd }, 200, corsHeaders)
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
