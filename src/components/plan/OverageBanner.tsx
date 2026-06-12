import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePlanStatus } from "@/hooks/usePlanStatus";

/**
 * Aviso informativo (no bloqueante) de overage activo en plan Profesional
 * (PRD §6.4). Aparece cuando se han superado las firmas incluidas.
 */
export function OverageBanner() {
  const { data: status } = usePlanStatus();

  if (!status?.ok || status.plan_id !== "profesional" || status.overage_firmas <= 0) {
    return null;
  }

  const { overage_firmas, overage_eur } = status;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-amber-900">
            Has superado las firmas incluidas en tu plan
          </h3>
          <p className="text-sm text-amber-700">
            Llevas <strong>{overage_firmas}</strong> firma{overage_firmas !== 1 ? "s" : ""} extra este mes
            (<strong>{overage_eur.toFixed(2).replace(".", ",")} €</strong> a 0,40 €/firma). Este importe se
            cargará en tu próxima factura.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
