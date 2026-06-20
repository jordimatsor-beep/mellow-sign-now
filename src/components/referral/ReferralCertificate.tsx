import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareButtons } from './ShareButtons'

interface ReferralCertificateProps {
  code: string
  url: string
}

export function ReferralCertificate({ code: _code, url }: ReferralCertificateProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 border-dashed transition-all duration-200',
        copied
          ? 'border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20'
          : 'border-primary/25 bg-primary/5'
      )}
    >
      {/* Watermark diagonal */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Sello top-right */}
      <FileCheck className="absolute right-4 top-4 h-5 w-5 text-primary/40" />

      <CardContent className="p-6">
        {/* Eyebrow */}
        <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          Código de invitación
        </p>

        {/* Divider */}
        <div className="mb-4 h-px bg-primary/15" />

        {/* URL copiable */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <code className="flex-1 min-w-0 rounded bg-background/60 px-3 py-2 font-mono text-sm text-foreground/80 break-all">
            {url}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={cn(
              'shrink-0 gap-2 transition-all duration-200',
              copied && 'border-emerald-500 text-emerald-700 animate-copy-pulse'
            )}
          >
            {copied
              ? <><Check className="h-4 w-4" /> ¡Copiado!</>
              : <><Copy className="h-4 w-4" /> Copiar enlace</>
            }
          </Button>
        </div>

        {/* Divider punteado */}
        <div className="mb-4 border-t border-dashed border-primary/15" />

        {/* Botones de compartir */}
        <ShareButtons url={url} />
      </CardContent>
    </Card>
  )
}
