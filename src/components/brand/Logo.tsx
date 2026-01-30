
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
    return (
        <img
            src="/logo.jpg"
            alt="FirmaClara"
            className={cn("h-auto object-contain", className)}
        />
    );
}
