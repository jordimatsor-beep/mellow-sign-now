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

export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

export interface ReferralData {
  code: string
  url: string
  stats: ReferralStats
  referrals: ReferralEntry[]
  commissions: CommissionBalance
  connectStatus: ConnectStatus
  isLoading: boolean
  error: string | null
  refetch: () => void
}

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
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('none')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

      // Estado del alta en Stripe Connect (necesaria para cobrar automáticamente)
      const { data: profile } = await supabase
        .from('users')
        .select('stripe_connect_status')
        .eq('id', user.id)
        .maybeSingle()
      setConnectStatus((profile?.stripe_connect_status as ConnectStatus) ?? 'none')
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
            // "Activo" = el referido ha pagado. Ya no hay regalo de firmas:
            // la recompensa es la comisión del 20% de cada uno de sus pagos.
            setStats((prev) => ({
              ...prev,
              total_pending: Math.max(0, prev.total_pending - 1),
              total_active: prev.total_active + 1,
            }))
            // I1-FIX: leer nombre del referido desde la ref, no del closure
            const refEntry = referralsRef.current.find((r) => r.id === updated.id)
            const name = refEntry?.name || 'Alguien'
            toast.success(`¡${name} ya es cliente de pago! Empiezas a cobrar tu 20% de cada pago suyo`)
            // Refrescar saldo para que aparezca la comisión recién generada
            fetchData()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchData]) // Sin `referrals` en deps — se lee desde referralsRef

  return { code, url, stats, referrals, commissions, connectStatus, isLoading, error, refetch: fetchData }
}
