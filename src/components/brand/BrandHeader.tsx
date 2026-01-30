import { Separator } from "@/components/ui/separator";



// Operia logo component - Tech attribution
export function OperiaLogo({ className = "h-6" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Operia chart icon */}
      <svg viewBox="0 0 40 32" className="h-full w-auto">
        {/* Bars */}
        <rect x="0" y="20" width="8" height="12" fill="hsl(var(--muted-foreground))" rx="1" />
        <rect x="12" y="12" width="8" height="20" fill="hsl(var(--muted-foreground))" rx="1" />
        <rect x="24" y="4" width="8" height="28" fill="hsl(var(--muted-foreground))" rx="1" />
        {/* Base line */}
        <rect x="0" y="30" width="40" height="2" fill="hsl(var(--muted-foreground))" />
      </svg>
      <span className="font-bold text-muted-foreground tracking-tight">OPERIA</span>
    </div>
  );
}

// Combined brand header for white-label
interface BrandHeaderProps {
  showServiceName?: boolean;
  serviceName?: string;
  className?: string;
}

export function BrandHeader({
  showServiceName = true,
  serviceName = "Firma Digital",
  className = ""
}: BrandHeaderProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Main brand - FirmaClara */}
      <div className="flex items-center gap-3">
        {showServiceName && (
          <>
            <span className="text-lg font-semibold text-foreground">{serviceName}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Powered by Operia badge
export function PoweredByOperia({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span>Powered by</span>
      <OperiaLogo className="h-4" />
    </div>
  );
}

// Full brand combination for headers
export function DualBrandHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <BrandHeader />
      <PoweredByOperia />
    </div>
  );
}
