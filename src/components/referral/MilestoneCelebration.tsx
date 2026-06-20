import { useEffect, useRef } from 'react'

interface MilestoneCelebrationProps {
  creditsEarned: number
}

const MILESTONES = [5, 10, 25, 50]

export function MilestoneCelebration({ creditsEarned }: MilestoneCelebrationProps) {
  const triggered = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const hit = MILESTONES.find((m) => creditsEarned >= m && !triggered.current.has(m))
    if (!hit) return
    triggered.current.add(hit)

    // Import dinámico — no contamina el bundle principal
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EF4444', '#10B981', '#F59E0B', '#ffffff'],
      })
    }).catch(() => { /* silencioso si no está disponible */ })
  }, [creditsEarned])

  return null
}
