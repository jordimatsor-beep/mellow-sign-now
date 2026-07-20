import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ReferralStats as Stats } from '@/hooks/useReferral'

function useCountUp(target: number, delay = 0, duration = 800): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    setValue(0)
    const timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const t = Math.min(elapsed / duration, 1)
        const progress = 1 - (1 - t) * (1 - t) // easeOutQuad
        setValue(Math.round(target * progress))
        if (t < 1) {
          frame.current = requestAnimationFrame(animate)
        } else {
          setValue(target)
        }
      }
      frame.current = requestAnimationFrame(animate)
    }, delay)
    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(frame.current)
    }
  }, [target, delay, duration])

  return value
}

interface ReferralStatsProps {
  stats: Stats
}

export function ReferralStats({ stats }: ReferralStatsProps) {
  const invited = useCountUp(stats.total_invited,   0)
  const active  = useCountUp(stats.total_active,  150)

  // Sin hitos de créditos: la recompensa es la comisión en dinero, que se
  // muestra en la tarjeta de ingresos. Aquí solo el embudo de referidos.
  const counters = [
    { label: 'invitados',        value: invited, highlight: false },
    { label: 'clientes de pago', value: active,  highlight: true  },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {counters.map(({ label, value, highlight }) => (
        <Card key={label} className={highlight ? 'ring-2 ring-primary/20' : ''}>
          <CardContent className="flex flex-col items-center py-5">
            <span className="text-4xl font-bold tracking-tight">{value}</span>
            <span className="mt-1 text-sm text-muted-foreground text-center">{label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
