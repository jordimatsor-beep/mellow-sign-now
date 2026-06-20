import { useEffect, useRef, useState } from 'react'
import { Share2, UserCheck, Gift } from 'lucide-react'

const STEPS = [
  {
    Icon: Share2,
    title: 'Comparte tu enlace',
    description: 'Envíalo a autónomos o pymes que firmen contratos habitualmente',
  },
  {
    Icon: UserCheck,
    title: 'Se registran y firman',
    description: 'Cuando envían su primer contrato, el sistema lo confirma automáticamente',
  },
  {
    Icon: Gift,
    title: 'Ambos ganáis',
    description: 'Tú recibes 5 firmas. Ellos, 3 de bienvenida',
  },
]

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="space-y-4">
      <h2 className="text-lg font-semibold">Cómo funciona</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, description }, i) => (
          <div
            key={title}
            className={[
              'flex flex-col gap-3 rounded-lg border p-4',
              visible ? 'animate-reveal-from-left' : 'opacity-0',
            ].join(' ')}
            style={visible ? { animationDelay: `${i * 200}ms` } : undefined}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
