import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface ReferralEntry {
  id: string
  name: string
  status: 'pending' | 'rewarded' | 'invalid'
  rewarded_at: string | null
  created_at: string
}

export interface ReferralStats {
  total_invited: number
  total_pending: number
  total_active: number
  credits_earned: number
  credits_remaining: number
}

export interface ReferralData {
  code: string
  url: string
  stats: ReferralStats
  referrals: ReferralEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const MILESTONES = [5, 10, 25, 50]

export function useReferral(): ReferralData {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [url, setUrl] = useState('')
  const [stats, setStats] = useState<ReferralStats>({
    total_invited: 0,
    total_pending: 0,
    total_active: 0,
    credits_earned: 0,
    credits_remaining: 50,
  })
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const triggeredMilestones = useRef<Set<number>>(new Set())

  const fetchData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-referral-info')
      if (fnError) throw fnError
      setCode(data.code)
      setUrl(data.url)
      setStats(data.stats)
      setReferrals(data.referrals)
    } catch {
      setError('No se pudo cargar la información de referidos.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Supabase Realtime: escuchar UPDATE en referrals propios
  // Requiere REPLICA IDENTITY FULL en la tabla (ya en migración) y filter server-side
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('referrals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string; name?: string }
          if (updated.status === 'rewarded') {
            setReferrals((prev) =>
              prev.map((r) =>
                r.id === updated.id
                  ? { ...r, status: 'rewarded', rewarded_at: new Date().toISOString() }
                  : r
              )
            )
            setStats((prev) => {
              const newEarned = prev.credits_earned + 5
              for (const m of MILESTONES) {
                if (newEarned >= m && !triggeredMilestones.current.has(m)) {
                  triggeredMilestones.current.add(m)
                  const msgs: Record<number, string> = {
                    5:  '¡Primer hito! Ya tienes 5 firmas ganadas',
                    10: '¡10 firmas ganadas con referidos! Sigue así',
                    25: '¡Increíble! 25 firmas. Eres embajador de FirmaClara',
                    50: '¡Máximo alcanzado! 50 firmas ganadas. Muchísimas gracias',
                  }
                  setTimeout(() => toast.success(msgs[m] ?? ''), 600)
                }
              }
              return {
                ...prev,
                total_pending: Math.max(0, prev.total_pending - 1),
                total_active: prev.total_active + 1,
                credits_earned: newEarned,
                credits_remaining: Math.max(0, prev.credits_remaining - 5),
              }
            })
            const refEntry = referrals.find((r) => r.id === updated.id)
            const name = refEntry?.name || 'Alguien'
            toast.success(`¡${name} acaba de enviar su primer contrato! +5 créditos para ti`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, referrals])

  return { code, url, stats, referrals, isLoading, error, refetch: fetchData }
}
