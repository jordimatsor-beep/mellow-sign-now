import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente autenticado con el JWT del usuario (para validar sesión)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente admin para operaciones que necesitan bypasear RLS
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener (o crear) el código de referido del usuario
    const { data: codeData, error: codeError } = await adminSupabase
      .rpc('get_or_create_referral_code', { p_user_id: user.id })
    if (codeError) throw codeError

    const code = codeData as string
    const baseUrl = Deno.env.get('APP_URL') ?? 'https://firmaclara.es'
    const url = `${baseUrl}/r/${code}`

    // Stats del usuario desde la vista referral_stats
    const { data: statsData } = await adminSupabase
      .from('referral_stats')
      .select('total_invited, total_pending, total_active, credits_earned, credits_remaining')
      .eq('user_id', user.id)
      .maybeSingle()

    // Saldo de comisiones de afiliado
    const { data: commissionData } = await adminSupabase
      .from('referral_commission_balance')
      .select('balance_pending, balance_paid, balance_total, commissions_pending, commissions_total')
      .eq('user_id', user.id)
      .maybeSingle()

    const stats = statsData ?? {
      total_invited: 0,
      total_pending: 0,
      total_active: 0,
      credits_earned: 0,
      credits_remaining: 50,
    }

    // Lista de referidos con nombre (solo primer nombre — privacidad)
    const { data: referralsRaw } = await adminSupabase
      .from('referrals')
      .select('id, status, rewarded_at, created_at, referred_id')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = (referralsRaw ?? []) as Array<{
      id: string; status: string; rewarded_at: string | null;
      created_at: string; referred_id: string
    }>

    // M2-FIX: una sola query IN en vez de N+1 queries individuales
    const referredIds = rows.map((r) => r.referred_id)
    const nameMap: Record<string, string> = {}
    if (referredIds.length > 0) {
      const { data: usersRaw } = await adminSupabase
        .from('users')
        .select('id, name')
        .in('id', referredIds)
      ;(usersRaw ?? []).forEach((u: { id: string; name?: string | null }) => {
        nameMap[u.id] = (u.name ?? '').split(' ')[0] || 'Usuario'
      })
    }

    const referrals = rows.map((r) => ({
      id: r.id,
      name: nameMap[r.referred_id] ?? 'Usuario',
      status: r.status,
      rewarded_at: r.rewarded_at,
      created_at: r.created_at,
    }))

    const commissions = commissionData ?? {
      balance_pending: 0,
      balance_paid: 0,
      balance_total: 0,
      commissions_pending: 0,
      commissions_total: 0,
    }

    return new Response(JSON.stringify({ code, url, stats, referrals, commissions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('get-referral-info error:', error)
    return new Response(JSON.stringify({ error: sanitizeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
