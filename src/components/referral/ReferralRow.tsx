import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { ReferralEntry } from '@/hooks/useReferral'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' },
  rewarded: { label: 'Activo',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  invalid:  { label: 'No válido', className: 'bg-muted text-muted-foreground hover:bg-muted' },
}

interface ReferralRowProps {
  entry: ReferralEntry
  index: number
}

export function ReferralRow({ entry, index }: ReferralRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.unobserve(e.target) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.invalid

  const dateStr = entry.rewarded_at
    ? format(new Date(entry.rewarded_at), 'dd/MM/yyyy', { locale: es })
    : format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: es })

  return (
    <div
      ref={ref}
      className={[
        'flex items-center justify-between rounded-lg border p-3 transition-all bg-card',
        visible ? 'animate-slide-in-right opacity-100' : 'opacity-0',
      ].join(' ')}
      style={visible ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      <div>
        <p className="text-sm font-medium">{entry.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.status === 'rewarded'
            ? `Cliente de pago · generas comisión · ${dateStr}`
            : entry.status === 'pending'
            ? 'Registrado · Pendiente de contratar un plan'
            : 'No válido'}
        </p>
      </div>
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    </div>
  )
}
