/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://esm.sh/zod@3.22.4"

// Inicia un checkout de Stripe para:
//   • suscripción Básico / Profesional (mode: subscription)
//   • pack puntual de 15 firmas        (mode: payment)
// El webhook stripe-webhook activa el plan / suma los créditos al completarse.

const CheckoutSchema = z.object({
  plan: z.enum(['basico', 'profesional', 'pack']),
  acceptOverage: z.boolean().optional(),
  returnUrl: z.string().url().optional(),
})

const ALLOWED_ORIGINS = [
  'https://firmaclara.com',
  'https://firmaclara.es',
  'https://www.firmaclara.com',
  'https://www.firmaclara.es',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  'http://localhost:5173',
]

const PLAN_TO_PRICE_ENV: Record<string, string> = {
  basico: 'STRIPE_PRICE_BASICO',
  profesional: 'STRIPE_PRICE_PROFESIONAL',
  pack: 'STRIPE_PRICE_PACK',
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 1. Autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // 2. Validación
    const parsed = CheckoutSchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: 'Invalid plan or parameters' }, 400, corsHeaders)
    }
    const { plan, acceptOverage, returnUrl } = parsed.data

    // Profesional exige aceptar la política de overage (PRD §2).
    if (plan === 'profesional' && acceptOverage !== true) {
      return json({ error: 'overage_consent_required' }, 400, corsHeaders)
    }

    const priceId = Deno.env.get(PLAN_TO_PRICE_ENV[plan])
    if (!priceId) {
      console.error(`Missing price env for plan ${plan}`)
      return json({ error: 'Plan not configured' }, 500, corsHeaders)
    }

    // 3. Cliente admin (para leer/escribir stripe_customer_id y logs)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Garantiza un stripe_customer_id para el usuario
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle()

    let customerId = profile?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // 5. URLs de retorno (origen validado)
    const baseUrl = isAllowed
      ? origin
      : (validateReturnOrigin(returnUrl) ?? Deno.env.get('APP_URL') ?? 'https://www.firmaclara.es')

    const isPack = plan === 'pack'
    const successFlag = isPack ? 'pack_success' : 'success'

    // 6. Crea la sesión de checkout
    const session = await stripe.checkout.sessions.create({
      mode: isPack ? 'payment' : 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard?checkout=${successFlag}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/precios?checkout=cancel`,
      metadata: {
        user_id: user.id,
        plan_id: isPack ? 'pack_puntual' : plan,
        ...(isPack ? { credits: '15' } : {}),
      },
      ...(isPack
        ? {}
        : {
            subscription_data: {
              metadata: {
                user_id: user.id,
                plan_id: plan,
                overage_accepted: plan === 'profesional' ? 'true' : 'false',
              },
            },
          }),
    })

    // 7. Log de auditoría (incluye consentimiento de overage si aplica)
    await supabaseAdmin.from('event_logs').insert({
      user_id: user.id,
      event_type: 'plan_checkout_started',
      event_data: {
        plan,
        mode: isPack ? 'payment' : 'subscription',
        overage_accepted: plan === 'profesional' ? !!acceptOverage : null,
      },
    })

    return json({ url: session.url, sessionId: session.id }, 200, corsHeaders)
  } catch (error: unknown) {
    console.error('create-plan-checkout error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500, corsHeaders)
  }
})

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validateReturnOrigin(returnUrl?: string): string | null {
  if (!returnUrl) return null
  try {
    const parsed = new URL(returnUrl)
    const ok = ALLOWED_ORIGINS.some((a) => {
      try { return new URL(a).origin === parsed.origin } catch { return false }
    })
    return ok ? parsed.origin : null
  } catch {
    return null
  }
}
