import { Separator } from "@/components/ui/separator";

// Multicentros logo component - Main brand
export function MulticentrosLogo({ className = "h-10" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Cart icon with dots */}
      <svg viewBox="0 0 60 60" className="h-full w-auto">
        {/* Cart base - using muted-foreground equivalent */}
        <path 
          d="M8 20 L20 20 L20 48 Q20 55 27 55 L50 55" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth="6" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Cart handle */}
        <path 
          d="M8 20 L2 8" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth="6" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Wheels */}
        <circle cx="30" cy="55" r="5" fill="hsl(var(--muted-foreground))" />
        <circle cx="46" cy="55" r="5" fill="hsl(var(--muted-foreground))" />
        {/* Colored dots - Primary (purple), Destructive (red), Chart-4 (blue) */}
        <circle cx="18" cy="8" r="6" fill="hsl(var(--primary))" />
        <circle cx="30" cy="16" r="6" fill="hsl(var(--destructive))" />
        <circle cx="42" cy="16" r="6" fill="hsl(var(--chart-4))" />
      </svg>
      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-light tracking-tight text-muted-foreground">multi</span>
        <span className="text-lg font-normal text-primary">centro</span>
        <span className="text-lg font-bold text-primary">comercial</span>
      </div>
    </div>
  );
}

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
      {/* Main brand - Multicentros */}
      <div className="flex items-center gap-3">
        <MulticentrosLogo className="h-10" />
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
