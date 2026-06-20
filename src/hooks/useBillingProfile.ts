import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface BillingProfile {
  id?: string;
  user_id?: string;
  razon_social: string;
  nif_cif: string;
  direccion_fiscal: string;
  ciudad: string;
  codigo_postal: string;
  pais: string;
  regimen_fiscal: string;
  email_facturacion: string;
  holded_contact_id?: string | null;
}

// Calcula el régimen fiscal según CP y país (PRD §3.1)
function calcRegimenFiscal(codigoPostal: string, pais: string): string {
  if (pais !== "ES") return "EXENTO_EU";
  if (codigoPostal.startsWith("35") || codigoPostal.startsWith("38")) return "IGIC_IC";
  return "IVA_ES";
}

export function useBillingProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["billing_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as BillingProfile | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (
      values: Omit<BillingProfile, "id" | "user_id" | "regimen_fiscal" | "holded_contact_id">
    ) => {
      const regimen_fiscal = calcRegimenFiscal(values.codigo_postal, values.pais);
      const { error } = await supabase
        .from("billing_profiles")
        .upsert(
          { ...values, user_id: user!.id, regimen_fiscal },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing_profile", user?.id] });
    },
  });

  return { profile: query.data, isLoading: query.isLoading, upsert };
}
