import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/
const MIN_PAYOUT_EUR = 15

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
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

    let body: { iban?: string } = {}
    try { body = await req.json() } catch { /* empty */ }

    const iban = (body.iban ?? '').replace(/\s/g, '').toUpperCase()
    if (!iban || !IBAN_REGEX.test(iban)) {
      return new Response(JSON.stringify({ error: 'iban_invalid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar saldo disponible
    const { data: balance } = await adminSupabase
      .from('referral_commission_balance')
      .select('balance_pending')
      .eq('user_id', user.id)
      .maybeSingle()

    const balancePending = Number(balance?.balance_pending ?? 0)
    if (balancePending < MIN_PAYOUT_EUR) {
      return new Response(JSON.stringify({ error: 'below_minimum', minimum: MIN_PAYOUT_EUR, balance: balancePending }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar que no hay otra solicitud pendiente
    const { data: existing } = await adminSupabase
      .from('payout_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'payout_already_pending' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insertar solicitud
    const { error: insertErr } = await adminSupabase.from('payout_requests').insert({
      user_id:    user.id,
      amount_eur: balancePending,
      iban,
      status: 'pending',
    })
    if (insertErr) throw insertErr

    // Notificar via n8n (non-fatal)
    const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL')
    if (n8nUrl) {
      const { data: userRow } = await adminSupabase
        .from('users').select('email, name').eq('id', user.id).maybeSingle()
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'affiliate.payout_requested',
          user_id: user.id,
          user_email: userRow?.email ?? '',
          user_name: userRow?.name ?? '',
          amount_eur: balancePending,
          iban,
        }),
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ ok: true, amount_eur: balancePending }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('request-commission-payout error:', error)
    return new Response(JSON.stringify({ error: sanitizeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
