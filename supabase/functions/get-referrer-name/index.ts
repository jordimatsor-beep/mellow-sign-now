import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code') ?? ''

    // Siempre 200 con name: null si el código no existe — evitar enumeración de códigos
    if (!CODE_REGEX.test(code)) {
      return new Response(JSON.stringify({ name: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar referrer_id por código
    const { data: codeRow } = await adminSupabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .maybeSingle()

    if (!codeRow) {
      return new Response(JSON.stringify({ name: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener nombre del referidor (solo primer nombre — privacidad)
    const { data: userData } = await adminSupabase
      .from('users')
      .select('name')
      .eq('id', (codeRow as { user_id: string }).user_id)
      .maybeSingle()

    const fullName = (userData as { name?: string } | null)?.name ?? ''
    const firstName = fullName.split(' ')[0] || null

    return new Response(JSON.stringify({ name: firstName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('get-referrer-name error:', error)
    // En caso de error, devolver name: null (nunca revelar si el código existe)
    return new Response(JSON.stringify({ name: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
