import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX    = /^FC-[A-Z2-9]{6}$/
const UUID_REGEX    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SESSION_REGEX = UUID_REGEX
const FIFTEEN_MINUTES = 15 * 60 * 1000
const RL_MAX_PER_MINUTE = 20

function extractClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

function normalizeEmail(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) return email.toLowerCase()
  const [local, domain] = parts
  return `${local.split('+')[0]}@${domain}`.toLowerCase()
}

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
    // I4: Rate limiting — 20 requests/minute por IP antes de consumir recursos
    const clientIp = extractClientIp(req)
    const adminSupabaseForRl = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: hits, error: rlErr } = await adminSupabaseForRl
      .rpc('check_referral_rl', { p_ip: clientIp, p_max: RL_MAX_PER_MINUTE })
    if (!rlErr && (hits as number) > RL_MAX_PER_MINUTE) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      })
    }

    let body: { ref_code?: string; new_user_id?: string; session_id?: string } = {}
    try { body = await req.json() } catch { /* body vacío */ }

    const { new_user_id, session_id } = body
    let { ref_code } = body
    // Tracks which session to mark consumed — may be resolved from email fallback
    let sessionIdToConsume: string | null = session_id ?? null

    if (!new_user_id || !UUID_REGEX.test(new_user_id)) {
      return new Response(JSON.stringify({ error: 'invalid_user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = adminSupabaseForRl

    // --- session_id path: look up ref_code from anon_referral_sessions ---
    if (session_id) {
      if (!SESSION_REGEX.test(session_id)) {
        return new Response(JSON.stringify({ error: 'invalid_session' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { data: sessionRow } = await adminSupabase
        .from('anon_referral_sessions')
        .select('ref_code, expires_at, consumed_at')
        .eq('session_id', session_id)
        .maybeSingle()

      if (!sessionRow) {
        return new Response(JSON.stringify({ error: 'invalid_session' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (sessionRow.consumed_at) {
        // Already consumed — idempotent OK (might be a retry after partial failure)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (new Date(sessionRow.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'session_expired' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      ref_code = sessionRow.ref_code
    }

    // C2-FIX: Verificar que new_user_id existe en auth.users y fue creado < 15 minutos
    const { data: { user: newUser }, error: userErr } = await adminSupabase.auth.admin.getUserById(new_user_id)
    if (userErr || !newUser) {
      return new Response(JSON.stringify({ error: 'invalid_user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const createdAt = new Date(newUser.created_at).getTime()
    if (Date.now() - createdAt > FIFTEEN_MINUTES) {
      return new Response(JSON.stringify({ error: 'registration_expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // --- Email-based fallback for cross-device attribution ---
    // If no session_id and no ref_code yet, try to find a pending session linked to this email.
    if (!ref_code && !session_id) {
      const userEmail = normalizeEmail(newUser.email ?? '')
      if (userEmail) {
        const { data: emailSession } = await adminSupabase
          .from('anon_referral_sessions')
          .select('session_id, ref_code')
          .eq('email', userEmail)
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (emailSession) {
          ref_code = emailSession.ref_code
          sessionIdToConsume = emailSession.session_id
        }
      }
    }

    // Validación de formato del código (aplica a todos los paths)
    if (!ref_code || !CODE_REGEX.test(ref_code)) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar referral_code → referrer_id
    const { data: codeRow, error: codeErr } = await adminSupabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', ref_code)
      .maybeSingle()

    if (codeErr || !codeRow) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const referrerId = (codeRow as { user_id: string }).user_id

    // C3 (defensa extra): auto-referido por UUID
    if (referrerId === new_user_id) {
      return new Response(JSON.stringify({ error: 'self_referral' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // C10: Normalizar emails para detectar alias '+' del mismo dominio
    const { data: referrerAuthData } = await adminSupabase.auth.admin.getUserById(referrerId)
    if (referrerAuthData?.user) {
      const referrerEmail = normalizeEmail(referrerAuthData.user.email ?? '')
      const newUserEmail  = normalizeEmail(newUser.email ?? '')
      if (referrerEmail && newUserEmail && referrerEmail === newUserEmail) {
        return new Response(JSON.stringify({ error: 'self_referral' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // INSERT en referrals — UNIQUE en referred_id previene duplicados
    const { error: insertErr } = await adminSupabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: new_user_id,
        status: 'pending',
        credits_to_referrer: 5,
        credits_to_referred: 3,
      })

    if (insertErr) {
      // UNIQUE violation (23505) → ya existe, idempotente
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw insertErr
    }

    // Mark the anon session as consumed (covers session_id path AND email-fallback path)
    if (sessionIdToConsume) {
      await adminSupabase
        .from('anon_referral_sessions')
        .update({ consumed_at: new Date().toISOString(), new_user_id })
        .eq('session_id', sessionIdToConsume)
        .is('consumed_at', null)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('register-referral error:', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
