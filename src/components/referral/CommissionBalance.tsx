import { useState } from 'react'
import { Euro, TrendingUp, Loader2, CheckCircle, Building2, AlertTriangle, CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { CommissionBalance as CommissionBalanceType, ConnectStatus } from '@/hooks/useReferral'

const MIN_PAYOUT = 15

interface CommissionBalanceProps {
  commissions: CommissionBalanceType
  connectStatus: ConnectStatus
  onPayoutRequested: () => void
}

function formatEur(amount: number) {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

export function CommissionBalance({ commissions, connectStatus }: CommissionBalanceProps) {
  const [loading, setLoading] = useState(false)

  const isActive = connectStatus === 'active'
  const reachesMin = commissions.balance_pending >= MIN_PAYOUT
  // El saldo puede ser negativo si hubo una devolución posterior al cobro:
  // se compensa con las comisiones de los meses siguientes.
  const hasNegativeBalance = commissions.balance_pending < 0

  // Abre el alta de Stripe Connect (o la retoma si quedó a medias).
  const handleConnect = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-connect-onboard', { body: {} })
      if (error || !data?.url) {
        toast.error('No se pudo abrir el alta de cobros. Inténtalo de nuevo.')
        return
      }
      window.location.href = data.url as string
    } catch {
      toast.error('No se pudo abrir el alta de cobros. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:border-emerald-900">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Euro className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Ingresos por afiliado</p>
            <p className="text-xs text-muted-foreground">20% de cada pago de tus referidos, de por vida</p>
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white dark:bg-background border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatEur(commissions.balance_pending)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">pendiente de cobro</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-background border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{formatEur(commissions.balance_total)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">ganado en total</p>
          </div>
        </div>

        {/* Saldo negativo por una devolución posterior al pago */}
        {hasNegativeBalance && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Se ha ajustado tu saldo porque un cliente pidió una devolución. No tienes que hacer nada:
              se compensa automáticamente con tus próximas comisiones.
            </p>
          </div>
        )}

        {/* Progreso hacia el mínimo */}
        {isActive && !reachesMin && commissions.balance_pending > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Te faltan <span className="font-medium text-foreground">{formatEur(MIN_PAYOUT - commissions.balance_pending)}</span> para el cobro de este mes
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, (commissions.balance_pending / MIN_PAYOUT) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Estado del cobro */}
        {isActive ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
            <CalendarClock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-medium">Cobro automático activado.</span>{' '}
              {reachesMin
                ? `A final de mes recibirás ${formatEur(commissions.balance_pending)} en tu cuenta.`
                : `Cuando superes los ${MIN_PAYOUT} € te lo transferimos a final de mes. Si no llegas, se acumula.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border bg-white dark:bg-background px-3 py-2.5">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {connectStatus === 'restricted'
                  ? 'Stripe necesita algún dato más para poder pagarte. Completa tu alta para recibir tus comisiones.'
                  : connectStatus === 'pending'
                  ? 'Tienes el alta a medias. Termínala para que podamos transferirte tus comisiones cada mes.'
                  : 'Da de alta tu cuenta una sola vez y recibirás tus comisiones automáticamente cada mes.'}
              </p>
            </div>
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {connectStatus === 'none' ? 'Activar mis cobros' : 'Completar mi alta'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
