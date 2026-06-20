import { useState } from 'react'
import { Users, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReferralEmptyStateProps {
  onCopy: () => void
}

export function ReferralEmptyState({ onCopy }: ReferralEmptyStateProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      <Button
        onClick={handleCopy}
        className={[
          'mt-2 gap-2 transition-all duration-300',
          copied ? 'bg-green-600 hover:bg-green-600' : '',
        ].join(' ')}
      >
        <span className={`transition-all duration-300 ${copied ? 'scale-110' : 'scale-100'}`}>
          {copied
            ? <Check className="h-4 w-4" />
            : <Copy className="h-4 w-4" />
          }
        </span>
        <span className="transition-all duration-300">
          {copied ? '¡Enlace copiado!' : 'Copiar mi enlace'}
        </span>
      </Button>
    </div>
  )
}
