import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlanStatus, PLAN_LABELS } from "@/hooks/usePlanStatus";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function formatPeriodEnd(iso: string) {
  try {
    return format(new Date(iso), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

export function SubscriptionCard() {
  const { data: status } = usePlanStatus();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Only render for paid subscriptions
  if (!status || (status.plan_id !== "basico" && status.plan_id !== "profesional")) {
    return null;
  }

  const { plan_id, subscription_cancel_at_period_end, subscription_period_end } = status;
  const isCanceling = subscription_cancel_at_period_end;
  const periodEndLabel = subscription_period_end
    ? formatPeriodEnd(subscription_period_end)
    : null;

  const handleCancel = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-subscription", { body: {} });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["plan_status"] });
      toast.success("Tu suscripción finalizará al terminar el periodo actual.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo cancelar la suscripción.");
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("reactivate-subscription", { body: {} });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["plan_status"] });
      toast.success("Tu suscripción se renovará automáticamente.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo reactivar la suscripción.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{PLAN_LABELS[plan_id]}</span>
            {isCanceling ? (
              <Badge variant="destructive" className="text-xs">Cancela al final del periodo</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Activa</Badge>
            )}
          </div>
          {periodEndLabel && (
            <p className="text-sm text-muted-foreground">
              {isCanceling
                ? `Finaliza el ${periodEndLabel} · No se renovará`
                : `Se renueva el ${periodEndLabel}`}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}

          {isCanceling ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={busy}>
                  Reactivar suscripción
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reactivar tu suscripción?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tu suscripción al plan {PLAN_LABELS[plan_id]} se renovará automáticamente al
                    finalizar el periodo actual.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReactivate}>Reactivar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={busy} className="text-destructive hover:text-destructive">
                  Cancelar suscripción
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar tu suscripción?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seguirás teniendo acceso hasta que finalice el periodo actual
                    {periodEndLabel ? ` (${periodEndLabel})` : ""}. Después, tu cuenta pasará al
                    plan Gratis.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantener suscripción</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleCancel}
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
