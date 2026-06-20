import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FIFTEEN_MINUTES = 15 * 60 * 1000

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
    let body: { ref_code?: string; new_user_id?: string } = {}
    try { body = await req.json() } catch { /* body vacío */ }

    const { ref_code, new_user_id } = body

    // Validación de formato
    if (!ref_code || !CODE_REGEX.test(ref_code)) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!new_user_id || !UUID_REGEX.test(new_user_id)) {
      return new Response(JSON.stringify({ error: 'invalid_user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
