/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

// Alta del afiliado como cuenta conectada (Stripe Connect Express).
// El afiliado la completa UNA vez; a partir de ahí sus comisiones se
// transfieren automáticamente cada mes sin pedirle ningún IBAN.
// Devuelve la URL de onboarding de Stripe a la que hay que redirigirle.

// El país de una cuenta Connect NO se puede cambiar una vez creada: si se
// elige mal, el afiliado queda bloqueado y hay que crear otra cuenta. Por eso
// se permite indicarlo, validado contra los países SEPA donde Stripe opera.
const SUPPORTED_COUNTRIES = new Set([
  'ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'AT', 'IE', 'LU', 'FI', 'GR',
  'SE', 'DK', 'PL', 'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI', 'EE', 'LV',
  'LT', 'CY', 'MT', 'NO', 'CH', 'GB',
])
const DEFAULT_COUNTRY = 'ES'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await adminSupabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_status, email, name')
      .eq('id', user.id)
      .maybeSingle()

    let accountId = profile?.stripe_connect_account_id as string | null

    // 1. Crear la cuenta conectada si aún no existe (idempotente por columna).
    if (!accountId) {
      let body: { country?: string } = {}
      try { body = await req.json() } catch { /* sin body: usamos el país por defecto */ }
      const requested = (body.country ?? '').toUpperCase()
      const country = SUPPORTED_COUNTRIES.has(requested) ? requested : DEFAULT_COUNTRY

      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email: profile?.email ?? user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
        // No fijamos business_type: los afiliados pueden ser particulares,
        // autónomos o empresas (los socios de Conektium lo son). Que sea
        // Stripe quien lo pregunte en el onboarding y aplique el KYC correcto.
        metadata: { firmaclara_user_id: user.id },
      })
      accountId = account.id

      const { error: saveErr } = await adminSupabase
        .from('users')
        .update({ stripe_connect_account_id: accountId, stripe_connect_status: 'pending' })
        .eq('id', user.id)
      if (saveErr) throw saveErr
    }

    // 2. Generar el enlace de onboarding (caduca, se regenera en cada petición).
    const baseUrl =
      Deno.env.get('SITE_URL') ?? Deno.env.get('APP_URL') ?? 'https://firmaclara.es'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/referidos?connect=refresh`,
      return_url: `${baseUrl}/referidos?connect=done`,
      type: 'account_onboarding',
    })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('affiliate-connect-onboard error:', error)
    return new Response(JSON.stringify({ error: sanitizeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
