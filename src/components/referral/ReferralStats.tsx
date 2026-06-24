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

const MILESTONE_SEQUENCE = [5, 10, 25, 50]

export function ReferralStats({ stats }: ReferralStatsProps) {
  const invited = useCountUp(stats.total_invited,   0)
  const active  = useCountUp(stats.total_active,  150)
  const earned  = useCountUp(stats.credits_earned, 300)

  const nextMilestone = MILESTONE_SEQUENCE.find((m) => m > stats.credits_earned) ?? 50
  const prevFiltered = [0, ...MILESTONE_SEQUENCE].filter((m) => m <= stats.credits_earned)
  const prevMilestone = prevFiltered[prevFiltered.length - 1] ?? 0
  // M4-FIX: guard NaN cuando nextMilestone === prevMilestone (credits_earned === 50)
  const progressPct   =
    stats.credits_earned >= 50
      ? 100
      : nextMilestone === prevMilestone
        ? 0
        : Math.round(((stats.credits_earned - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  const progressLabel =
    stats.credits_earned >= 50
      ? 'Máximo alcanzado · Has ganado 50 firmas con referidos'
      : (() => {
          const n = Math.max(1, Math.ceil((nextMilestone - stats.credits_earned) / 5));
          return `Invita a ${n} ${n === 1 ? 'persona' : 'personas'} más para ganar tus próximas 5 firmas`;
        })()

  const counters = [
    { label: 'invitados',        value: invited, highlight: false },
    { label: 'activos',          value: active,  highlight: false },
    { label: 'créditos ganados', value: earned,  highlight: true  },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {counters.map(({ label, value, highlight }) => (
          <Card key={label} className={highlight ? 'ring-2 ring-primary/20' : ''}>
            <CardContent className="flex flex-col items-center py-5">
              <span className="text-4xl font-bold tracking-tight">{value}</span>
              <span className="mt-1 text-sm text-muted-foreground text-center">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar hacia próximo hito */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{progressLabel}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-[1200ms]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
