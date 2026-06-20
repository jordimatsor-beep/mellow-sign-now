import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar rol admin
    const { data: userData } = await adminSupabase
      .from('users').select('role').eq('id', user.id).maybeSingle()
    if (userData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let body: { payout_id?: string; notes?: string } = {}
    try { body = await req.json() } catch { /* empty */ }

    if (!body.payout_id || !UUID_REGEX.test(body.payout_id)) {
      return new Response(JSON.stringify({ error: 'invalid_payout_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar que el payout existe y está pendiente
    const { data: payout } = await adminSupabase
      .from('payout_requests')
      .select('id, status, amount_eur, iban, user_id')
      .eq('id', body.payout_id)
      .maybeSingle()

    if (!payout) {
      return new Response(JSON.stringify({ error: 'payout_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (payout.status === 'paid') {
      return new Response(JSON.stringify({ error: 'already_paid' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Marcar como pagado — el trigger sync_commissions_on_payout_paid
    // marca automáticamente las referral_commissions como paid
    const { error: updateErr } = await adminSupabase
      .from('payout_requests')
      .update({
        status:       'paid',
        resolved_at:  new Date().toISOString(),
        notes:        body.notes ?? null,
      })
      .eq('id', body.payout_id)

    if (updateErr) throw updateErr

    return new Response(JSON.stringify({ ok: true, amount_eur: payout.amount_eur }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('admin-mark-payout-paid error:', error)
    return new Response(JSON.stringify({ error: sanitizeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
