import { Separator } from "@/components/ui/separator";

// Multicentro logo component - Horizontal compact version for headers
export function MulticentroLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Cart icon with dots - simplified */}
      <svg viewBox="0 0 48 48" className="h-full w-auto flex-shrink-0">
        {/* Cart base */}
        <path 
          d="M6 14 L14 14 L14 34 Q14 40 20 40 L38 40" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth="4" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Cart handle */}
        <path 
          d="M6 14 L2 6" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth="4" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Wheels */}
        <circle cx="22" cy="42" r="3" fill="hsl(var(--muted-foreground))" />
        <circle cx="34" cy="42" r="3" fill="hsl(var(--muted-foreground))" />
        {/* Colored dots */}
        <circle cx="14" cy="6" r="4" fill="hsl(var(--primary))" />
        <circle cx="24" cy="10" r="4" fill="hsl(var(--destructive))" />
        <circle cx="34" cy="10" r="4" fill="hsl(var(--chart-4))" />
      </svg>
      {/* Horizontal text layout */}
      <div className="flex items-baseline gap-0.5 leading-none">
        <span className="text-sm font-light text-muted-foreground">multi</span>
        <span className="text-sm font-semibold text-primary">centro</span>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const MulticentrosLogo = MulticentroLogo;

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
      {/* Main brand - Multicentro */}
      <div className="flex items-center gap-3">
        <MulticentroLogo className="h-10" />
        {showServiceName && (
          <>
            <Separator orientation="vertical" className="h-8" />
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
