import { Link } from 'react-router-dom'
import { ArrowLeft, Gift, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReferral } from '@/hooks/useReferral'
import { useAuth } from '@/context/AuthContext'
import { ReferralCertificate } from '@/components/referral/ReferralCertificate'
import { ReferralStats } from '@/components/referral/ReferralStats'
import { HowItWorks } from '@/components/referral/HowItWorks'
import { ReferralList } from '@/components/referral/ReferralList'
import { CommissionBalance } from '@/components/referral/CommissionBalance'

export default function Invita() {
  const { user } = useAuth()
  const { code, url, stats, referrals, commissions, connectStatus, isLoading, error, refetch } = useReferral()

  const handleCopy = async () => {
    if (url) await navigator.clipboard.writeText(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Gift className="h-6 w-6 text-primary" />
            Invita y gana dinero
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cobra el 20% de cada pago de los clientes que traigas, de por vida.
            Te lo ingresamos en tu cuenta cada mes.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Contenido principal */}
      {!isLoading && !error && code && (
        <>
          {/* Certificado con el enlace */}
          <ReferralCertificate url={url} />

          {/* Contadores */}
          <ReferralStats stats={stats} />

          {/* Ingresos en dinero por afiliado */}
          <CommissionBalance
            commissions={commissions}
            connectStatus={connectStatus}
            onPayoutRequested={refetch}
          />

          {/* Cómo funciona */}
          <HowItWorks />

          {/* Lista de referidos */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Mis referidos</h2>
            <ReferralList referrals={referrals} onCopy={handleCopy} />
          </div>
        </>
      )}
    </div>
  )
}
