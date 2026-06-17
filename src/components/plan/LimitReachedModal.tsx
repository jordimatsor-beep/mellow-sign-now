import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startPlanCheckout } from "@/lib/billing";

interface LimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan en el que se alcanzó el límite ('gratis' | 'basico'). */
  plan: "gratis" | "basico" | null;
  limite?: number | null;
}

/**
 * Modal de límite alcanzado (PRD §6.3). Se muestra cuando el envío devuelve
 * HTTP 402 (limite_alcanzado). Ofrece comprar pack o mejorar de plan.
 */
export function LimitReachedModal({ open, onOpenChange, plan, limite }: LimitReachedModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"pack" | "basico" | null>(null);

  const planLabel = plan === "basico" ? "Básico" : "Gratis";
  const upgradeTo = plan === "basico" ? "profesional" : "basico";
  const upgradeLabel = plan === "basico" ? "Profesional" : "Básico";

  const buyPack = async () => {
    setLoading("pack");
    try {
      await startPlanCheckout("pack");
    } finally {
      setLoading(null);
    }
  };

  const upgrade = async () => {
    // Profesional requiere consentimiento de overage → se gestiona en /precios.
    if (upgradeTo === "profesional") {
      onOpenChange(false);
      navigate("/precios");
      return;
    }
    setLoading("basico");
    try {
      await startPlanCheckout("basico");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Has alcanzado el límite de tu plan</DialogTitle>
          <DialogDescription>
            Tu plan {planLabel} incluye {limite ?? ""} firmas al mes y ya las has usado todas este mes.
            Elige cómo seguir enviando:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Button className="w-full justify-between" onClick={buyPack} disabled={!!loading}>
            <span>Comprar pack de 15 firmas · 15 €</span>
            {loading === "pack" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={upgrade}
            disabled={!!loading}
          >
            <span>Mejorar a {upgradeLabel}</span>
            {loading === "basico" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => navigate("/precios")}>
            Ver todos los planes
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
