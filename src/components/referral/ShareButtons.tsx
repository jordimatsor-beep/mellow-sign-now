import { MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ShareButtonsProps {
  url: string
}

export function ShareButtons({ url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const whatsappText = encodeURIComponent(
    `Hola, te paso FirmaClara: una forma muy sencilla y barata de firmar contratos online. Puedes empezar gratis: ${url}`
  )
  const emailSubject = encodeURIComponent('Te recomiendo FirmaClara para firmar contratos')
  const emailBody = encodeURIComponent(
    `Hola,\n\nTe recomiendo FirmaClara, una herramienta para firmar contratos online en segundos, sin instalaciones.\n\nEmpieza gratis aquí: ${url}\n\nSaludos`
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
        asChild
      >
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </Button>

      <Button variant="outline" size="sm" className="gap-2" asChild>
        <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`}>
          <Mail className="h-4 w-4" />
          Email
        </a>
      </Button>

      <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
        {copied
          ? <><Check className="h-4 w-4 text-emerald-600" /> ¡Copiado!</>
          : <><Copy className="h-4 w-4" /> Copiar</>
        }
      </Button>
    </div>
  )
}
