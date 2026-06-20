import { useEffect, useRef } from 'react'

interface MilestoneCelebrationProps {
  creditsEarned: number
  userId?: string
}

const MILESTONES = [5, 10, 25, 50]

function getStorageKey(userId?: string) {
  return `fc_milestones_${userId ?? 'anon'}`
}

function loadTriggered(userId?: string): Set<number> {
  try {
    const stored = sessionStorage.getItem(getStorageKey(userId))
    if (stored) return new Set(JSON.parse(stored) as number[])
  } catch { /* silencioso */ }
  return new Set()
}

function saveTriggered(set: Set<number>, userId?: string) {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify([...set]))
  } catch { /* silencioso */ }
}

export function MilestoneCelebration({ creditsEarned, userId }: MilestoneCelebrationProps) {
  // I5-FIX: cargar hitos ya disparados desde sessionStorage para sobrevivir re-mounts
  const triggered = useRef<Set<number>>(loadTriggered(userId))

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const hit = MILESTONES.find((m) => creditsEarned >= m && !triggered.current.has(m))
    if (!hit) return
    triggered.current.add(hit)
    saveTriggered(triggered.current, userId)

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EF4444', '#10B981', '#F59E0B', '#ffffff'],
      })
    }).catch(() => { /* silencioso */ })
  }, [creditsEarned, userId])

  return null
}
