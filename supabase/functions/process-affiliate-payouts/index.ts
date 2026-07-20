/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pago automático mensual de comisiones de afiliado (Stripe Connect).
// Lo dispara un cron a fin de mes. Nadie tiene que revisar ni subir nada.
//
// Reglas:
//   • Saldo neto = comisiones − ajustes por reembolso/disputa.
//   • Si el neto < 15 € NO se paga: las comisiones siguen 'pending' y se
//     acumulan al mes siguiente (rollover automático).
//   • Si el afiliado no ha completado su alta en Stripe, se salta (rollover).
//   • Índice único (user_id, period_month) → nunca paga dos veces el mismo mes.

const MIN_PAYOUT_EUR = 15

// Comparación en tiempo constante: evita filtrar el secreto midiendo tiempos.
function secretsMatch(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

serve(async (req) => {
  // Protegido por secreto: mueve dinero real, no puede ser público.
  const cronSecret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!cronSecret || !provided || !secretsMatch(cronSecret, provided)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Mes de ciclo (primer día del mes actual) para la clave de idempotencia.
    const now = new Date()
    const periodMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`

    // Corte temporal fijado ANTES de leer saldos. El cálculo y el marcado de
    // comisiones como pagadas usan este mismo instante, así que no se puede
    // "colar" una comisión que quede marcada como pagada sin ir en el importe.
    const cutoffAt = now.toISOString()

    // 1. Saldos netos por afiliado (ya descuentan ajustes por devolución).
    const { data: batch, error: batchErr } = await supabase
      .rpc('get_affiliate_payout_batch', { p_min_eur: MIN_PAYOUT_EUR, p_cutoff: cutoffAt })
    if (batchErr) throw batchErr

    const rows = (batch ?? []) as Array<{ user_id: string; net_pending: number; eligible: boolean }>

    const result = { period: periodMonth, paid: 0, skipped_below_min: 0, skipped_no_account: 0, failed: 0, total_eur: 0 }

    for (const row of rows) {
      const netEur = Number(row.net_pending)

      // Por debajo del mínimo → se acumula al mes siguiente.
      if (!row.eligible || netEur < MIN_PAYOUT_EUR) {
        result.skipped_below_min++
        continue
      }

      // 2. El afiliado debe tener su alta de Stripe completada.
      const { data: affiliate } = await supabase
        .from('users')
        .select('stripe_connect_account_id, stripe_connect_status')
        .eq('id', row.user_id)
        .maybeSingle()

      const accountId = affiliate?.stripe_connect_account_id as string | null
      if (!accountId || affiliate?.stripe_connect_status !== 'active') {
        // Sin alta completada no se puede transferir: se acumula para el mes que viene.
        result.skipped_no_account++
        continue
      }

      // 3. Reservar el pago del mes (el índice único evita duplicados si el cron repite).
      const { data: payout, error: payoutErr } = await supabase
        .from('payout_requests')
        .insert({
          user_id: row.user_id,
          amount_eur: netEur,
          status: 'processing',
          period_month: periodMonth,
          cutoff_at: cutoffAt,
        })
        .select('id')
        .maybeSingle()

      if (payoutErr) {
        // 23505 = ya existe pago para este afiliado y mes → nada que hacer.
        if (payoutErr.code === '23505') continue
        console.error(`payout insert failed for ${row.user_id}:`, payoutErr.message)
        result.failed++
        continue
      }

      // 4. Transferir el dinero a su cuenta conectada.
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(netEur * 100),
          currency: 'eur',
          destination: accountId,
          description: `Comisiones de afiliado FirmaClara — ${periodMonth.slice(0, 7)}`,
          metadata: { firmaclara_user_id: row.user_id, period: periodMonth },
        }, {
          // CRÍTICO: sin esto, un reintento (timeout de red, re-ejecución del
          // cron, fallo al guardar en BD) crearía una SEGUNDA transferencia
          // real. Con la clave ligada al id del pago, Stripe devuelve la
          // transferencia ya creada en vez de duplicar el dinero.
          idempotencyKey: `affiliate_payout_${payout!.id}`,
        })

        // 'paid' dispara sync_commissions_on_payout_paid, que marca como pagadas
        // las comisiones (y ajustes) incluidas en este saldo.
        await supabase
          .from('payout_requests')
          .update({ status: 'paid', stripe_transfer_id: transfer.id, resolved_at: new Date().toISOString() })
          .eq('id', payout!.id)

        result.paid++
        result.total_eur += netEur
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`transfer failed for ${row.user_id}:`, msg)
        // Se marca rechazado: las comisiones siguen pendientes y se reintentan el mes siguiente.
        await supabase
          .from('payout_requests')
          .update({ status: 'rejected', notes: `Transferencia fallida: ${msg}`.slice(0, 500), resolved_at: new Date().toISOString() })
          .eq('id', payout!.id)
        result.failed++
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('process-affiliate-payouts error:', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
