import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/
const RL_MAX_PER_MINUTE = 10

function extractIpPrefix(req: Request): string | null {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!ip) return null
  // Store /24 prefix for IPv4, /64 prefix for IPv6 — not the full address
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
  if (v4) return `${v4[1]}.0/24`
  const v6parts = ip.split(':')
  if (v6parts.length >= 4) return `${v6parts.slice(0, 4).join(':')}/64`
  return null
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: { ref_code?: string } = {}
    try { body = await req.json() } catch { /* empty body */ }

    const { ref_code } = body
    if (!ref_code || !CODE_REGEX.test(ref_code)) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Rate limit: max 10 sessions/minute per IP prefix
    const ipPrefix = extractIpPrefix(req)
    if (ipPrefix) {
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
      const { count } = await admin
        .from('anon_referral_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('ip_prefix', ipPrefix)
        .gte('created_at', oneMinuteAgo)
      if ((count ?? 0) >= RL_MAX_PER_MINUTE) {
        return new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        })
      }
    }

    // Validate that the ref_code actually exists
    const { data: codeRow } = await admin
      .from('referral_codes')
      .select('user_id')
      .eq('code', ref_code)
      .maybeSingle()

    if (!codeRow) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create the server-side session
    const { data: session, error: insertErr } = await admin
      .from('anon_referral_sessions')
      .insert({ ref_code, ip_prefix: ipPrefix })
      .select('session_id')
      .single()

    if (insertErr || !session) throw insertErr ?? new Error('insert failed')

    return new Response(JSON.stringify({ session_id: session.session_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('capture-anon-referral error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
