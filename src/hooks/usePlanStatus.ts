import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type PlanId = "gratis" | "basico" | "profesional";

export interface PlanStatus {
  ok: boolean;
  plan_id: PlanId;
  subscription_status: "active" | "past_due" | "canceled" | "trialing";
  firmas_usadas_mes: number;
  limite: number;
  firmas_creditos: number;
  overage_firmas: number;
  overage_eur: number;
  plan_renewed_at: string | null;
  grace_until: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
}

export const PLAN_LABELS: Record<PlanId, string> = {
  gratis: "Gratis",
  basico: "Básico",
  profesional: "Profesional",
};

/**
 * Estado del plan del usuario (cuota, créditos de pack, overage, renovación).
 * Lee la RPC get_plan_status, que centraliza el cálculo en el servidor.
 */
export function usePlanStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plan_status", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PlanStatus> => {
      const { data, error } = await supabase.rpc("get_plan_status");
      if (error) throw error;
      return data as PlanStatus;
    },
  });
}
