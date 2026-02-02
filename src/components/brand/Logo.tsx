
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
}

import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface LogoProps {
    className?: string;
    asLink?: boolean;
}

export function Logo({ className, asLink = true }: LogoProps) {
    const { session } = useAuth();

    const LogoImage = (
        <img
            src="/logo.jpg"
            alt="FirmaClara"
            className={cn("h-auto object-contain", className)}
        />
    );

    if (!asLink) return LogoImage;

    if (session) {
        return <Link to="/dashboard">{LogoImage}</Link>;
    }

    return (
        <a href="https://firmaclara.es/" target="_self" rel="noopener noreferrer">
            {LogoImage}
        </a>
    );
}
