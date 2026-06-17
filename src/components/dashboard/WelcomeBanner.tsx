import { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WELCOME_CREDITS } from "@/lib/constants";

const DISMISS_KEY = "firmaclara_welcome_dismissed";

interface WelcomeBannerProps {
  credits: number;
  hasSentDocument: boolean;
}

// QW-01: recordatorio de las firmas gratuitas para cuentas nuevas. Se muestra
// mientras el usuario no haya enviado ningún documento y conserve su saldo de
// bienvenida; desaparece al enviar el primer documento o al cerrarlo (persistido
// en localStorage para no reaparecer en cada visita).
export function WelcomeBanner({ credits, hasSentDocument }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true"
  );

  if (dismissed || hasSentDocument || credits < WELCOME_CREDITS) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  const plural = credits !== 1;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-indigo-500/5">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            Tienes {credits} firma{plural ? "s" : ""} gratuita{plural ? "s" : ""} disponible{plural ? "s" : ""}
          </p>
          <Link
            to="/documents/new"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Envía tu primer documento <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar aviso de bienvenida"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
