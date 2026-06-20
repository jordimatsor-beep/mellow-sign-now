import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReferralEmptyStateProps {
  onCopy: () => void
}

export function ReferralEmptyState({ onCopy }: ReferralEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Users className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-medium">Todavía no has invitado a nadie</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Comparte tu enlace con clientes, proveedores o colegas autónomos.
        Cuando envíen su primer contrato, los dos ganáis créditos.
      </p>
      <Button onClick={onCopy} className="mt-2">
        Copiar mi enlace
      </Button>
    </div>
  )
}
