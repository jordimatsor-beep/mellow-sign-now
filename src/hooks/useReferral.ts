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

export interface CommissionBalance {
  balance_pending: number
  balance_paid: number
  balance_total: number
  commissions_pending: number
  commissions_total: number
}

export interface ReferralData {
  code: string
  url: string
  stats: ReferralStats
  referrals: ReferralEntry[]
  commissions: CommissionBalance
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const MILESTONES = [5, 10, 25, 50]

const DEFAULT_COMMISSIONS: CommissionBalance = {
  balance_pending: 0,
  balance_paid: 0,
  balance_total: 0,
  commissions_pending: 0,
  commissions_total: 0,
}

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
  const [commissions, setCommissions] = useState<CommissionBalance>(DEFAULT_COMMISSIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const triggeredMilestones = useRef<Set<number>>(new Set())
  // I1-FIX: ref para leer referrals actuales en el callback de Realtime sin stale closure
  const referralsRef = useRef<ReferralEntry[]>([])

  // Mantener ref sincronizado con el estado
  useEffect(() => { referralsRef.current = referrals }, [referrals])

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
      setCommissions(data.commissions ?? DEFAULT_COMMISSIONS)
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
  // I1-FIX: sin `referrals` en deps → el canal no se re-suscribe en cada actualización de estado
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
          const updated = payload.new as {
            id: string
            status: string
            credits_to_referrer?: number
          }
          if (updated.status === 'rewarded') {
            // Actualizar lista usando ref (evita stale closure)
            setReferrals((prev) =>
              prev.map((r) =>
                r.id === updated.id
                  ? { ...r, status: 'rewarded', rewarded_at: new Date().toISOString() }
                  : r
              )
            )
            // I2-FIX: usar credits_to_referrer del payload en vez de hardcodear 5
            const creditsGained = updated.credits_to_referrer ?? 5
            setStats((prev) => {
              const newEarned = prev.credits_earned + creditsGained
              for (const m of MILESTONES) {
                if (newEarned >= m && !triggeredMilestones.current.has(m)) {
                  triggeredMilestones.current.add(m)
                  const msgs: Record<number, string> = {
                    5:  '¡Primer hito! Ya tienes 5 créditos ganados',
                    10: '¡10 créditos ganados con referidos! Sigue así',
                    25: '¡Increíble! 25 créditos. Eres embajador de FirmaClara',
                    50: '¡Máximo alcanzado! 50 créditos ganados. Muchísimas gracias',
                  }
                  setTimeout(() => toast.success(msgs[m] ?? ''), 600)
                }
              }
              return {
                ...prev,
                total_pending: Math.max(0, prev.total_pending - 1),
                total_active: prev.total_active + 1,
                credits_earned: newEarned,
                credits_remaining: Math.max(0, prev.credits_remaining - creditsGained),
              }
            })
            // I1-FIX: leer nombre del referido desde la ref, no del closure
            const refEntry = referralsRef.current.find((r) => r.id === updated.id)
            const name = refEntry?.name || 'Alguien'
            toast.success(`¡${name} acaba de enviar su primer contrato! +${creditsGained} créditos para ti`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user]) // Sin `referrals` en deps — se lee desde referralsRef

  return { code, url, stats, referrals, commissions, isLoading, error, refetch: fetchData }
}
