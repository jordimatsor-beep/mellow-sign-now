import { useState } from 'react'
import { Euro, TrendingUp, Loader2, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { CommissionBalance as CommissionBalanceType } from '@/hooks/useReferral'

const MIN_PAYOUT = 15

interface CommissionBalanceProps {
  commissions: CommissionBalanceType
  onPayoutRequested: () => void
}

function formatEur(amount: number) {
  return amount.toFixed(2).replace('.', ',') + ' €'
}

export function CommissionBalance({ commissions, onPayoutRequested }: CommissionBalanceProps) {
  const [showForm, setShowForm] = useState(false)
  const [iban, setIban] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const canRequest = commissions.balance_pending >= MIN_PAYOUT

  const handleRequest = async () => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (!cleanIban) { toast.error('Introduce tu IBAN'); return }

    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('request-commission-payout', {
        body: { iban: cleanIban },
      })
      if (error) {
        const msg = typeof error === 'object' && 'message' in error ? (error as { message: string }).message : String(error)
        if (msg.includes('below_minimum')) {
          toast.error(`Saldo mínimo para retirar: ${MIN_PAYOUT} €`)
        } else if (msg.includes('payout_already_pending')) {
          toast.error('Ya tienes una solicitud de cobro pendiente')
        } else {
          toast.error('Error al solicitar el cobro')
        }
        return
      }
      setDone(true)
      toast.success(`Solicitud enviada — recibirás ${formatEur(commissions.balance_pending)} en tu cuenta`)
      onPayoutRequested()
    } catch {
      toast.error('Error al solicitar el cobro')
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
            <p className="text-xs text-muted-foreground">20% de cada compra de tus referidos</p>
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white dark:bg-background border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatEur(commissions.balance_pending)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">disponible</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-background border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{formatEur(commissions.balance_total)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">ganado en total</p>
          </div>
        </div>

        {/* Progreso hacia mínimo */}
        {!canRequest && commissions.balance_pending > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Te faltan <span className="font-medium text-foreground">{formatEur(MIN_PAYOUT - commissions.balance_pending)}</span> para poder retirar
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, (commissions.balance_pending / MIN_PAYOUT) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Solicitar cobro */}
        {done ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Solicitud enviada — procesamos tu transferencia en 1-3 días hábiles
            </p>
          </div>
        ) : showForm ? (
          <div className="space-y-2">
            <Label htmlFor="iban" className="text-xs">IBAN para la transferencia</Label>
            <Input
              id="iban"
              placeholder="ES76 2100 0813 6101 2345 6789"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="font-mono text-sm uppercase"
              maxLength={34}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRequest}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Solicitar ${formatEur(commissions.balance_pending)}`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant={canRequest ? 'default' : 'outline'}
            className={canRequest ? 'w-full bg-emerald-600 hover:bg-emerald-700' : 'w-full'}
            disabled={!canRequest}
            onClick={() => setShowForm(true)}
          >
            {canRequest
              ? `Retirar ${formatEur(commissions.balance_pending)}`
              : `Mínimo ${MIN_PAYOUT} € para retirar`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
