import { Link } from "react-router-dom";
import { CreditCard, Settings, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePlanStatus, PLAN_LABELS } from "@/hooks/usePlanStatus";
import { openBillingPortal } from "@/lib/billing";
import { useState } from "react";
import { format, addMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Bloque de uso del plan para el dashboard (PRD §6.2):
 * plan actual, barra de cuota mensual, créditos de pack y próxima renovación.
 */
export function PlanUsageCard() {
  const { data: status, isLoading } = usePlanStatus();
  const [openingPortal, setOpeningPortal] = useState(false);

  if (isLoading || !status?.ok) {
    return (
      <Card className="border shadow-sm bg-white">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { plan_id, firmas_usadas_mes, limite, firmas_creditos, plan_renewed_at, subscription_status } = status;
  const pastDue = subscription_status === "past_due";
  const pct = limite > 0 ? Math.min(100, Math.round((firmas_usadas_mes / limite) * 100)) : 0;
  const nearLimit = limite > 0 && firmas_usadas_mes / limite >= 0.8;
  const atLimit = limite > 0 && firmas_usadas_mes >= limite;
  const isPaid = plan_id !== "gratis";

  const nextRenewal =
    plan_id === "gratis"
      ? startOfMonth(addMonths(new Date(), 1))
      : plan_renewed_at
      ? addMonths(new Date(plan_renewed_at), 1)
      : null;

  const handlePortal = async () => {
    setOpeningPortal(true);
    try {
      await openBillingPortal();
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="p-5 space-y-4">
        {pastDue && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">
              No hemos podido cobrar tu cuota. Actualiza tu método de pago para no perder tu plan.
            </p>
            <Button size="sm" variant="destructive" onClick={handlePortal} disabled={openingPortal}>
              {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Actualizar pago"}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tu plan:</span>
            <span className="font-semibold text-foreground">{PLAN_LABELS[plan_id]}</span>
            {plan_id === "profesional" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Pro
              </span>
            )}
          </div>
          {isPaid ? (
            <Button size="sm" variant="outline" onClick={handlePortal} disabled={openingPortal}>
              {openingPortal ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Settings className="mr-1.5 h-3.5 w-3.5" />
              )}
              Gestionar
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to="/precios">Ver planes</Link>
            </Button>
          )}
        </div>

        {/* Cuota mensual */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Firmas este mes</span>
            <span className={cn("font-medium", nearLimit ? "text-amber-600" : "text-foreground")}>
              {firmas_usadas_mes}/{limite}
            </span>
          </div>
          <Progress
            value={pct}
            className={cn(nearLimit && "[&>div]:bg-amber-500")}
          />
        </div>

        {/* Créditos de pack */}
        {firmas_creditos > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Créditos de pack disponibles:{" "}
              <span className="font-semibold text-foreground">{firmas_creditos}</span>
            </span>
          </div>
        )}

        {nextRenewal && (
          <p className="text-xs text-muted-foreground">
            Próxima renovación: {format(nextRenewal, "d 'de' MMM yyyy", { locale: es })}
          </p>
        )}

        {/* Upgrade cuando se agota la cuota en planes sin overage */}
        {atLimit && firmas_creditos === 0 && plan_id !== "profesional" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-800">Has agotado las firmas de tu plan este mes.</p>
            <Button size="sm" asChild>
              <Link to="/precios">Mejorar plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
