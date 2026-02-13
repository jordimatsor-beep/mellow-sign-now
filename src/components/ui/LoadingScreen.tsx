import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
    message?: string;
    className?: string;
}

export function LoadingScreen({ message = "Cargando...", className }: LoadingScreenProps) {
    return (
        <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300", className)}>
            <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-white/50 shadow-lg border border-gray-100">
                <div className="relative">
                    <Logo className="h-16 w-auto" asLink={false} />
                    {/* Pulse effect behind logo */}
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse -z-10" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-progress-indeterminate" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}
