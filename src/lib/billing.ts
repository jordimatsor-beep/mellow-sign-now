import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type PlanChoice = "basico" | "profesional" | "pack";

async function readEdgeError(error: unknown): Promise<string> {
  const e = error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } };
  let msg = e?.message ?? "error";
  try {
    const body = await e?.context?.json?.();
    if (body?.error) msg = body.error;
  } catch {
    /* noop */
  }
  return msg;
}

/**
 * Inicia el checkout de Stripe para una suscripción (Básico/Profesional) o el
 * pack puntual. Redirige al checkout hospedado de Stripe.
 */
export async function startPlanCheckout(
  plan: PlanChoice,
  opts?: { acceptOverage?: boolean }
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-plan-checkout", {
    body: { plan, acceptOverage: opts?.acceptOverage, returnUrl: window.location.origin },
  });

  if (error) {
    const msg = await readEdgeError(error);
    if (msg === "overage_consent_required") {
      toast.error("Debes aceptar la política de firmas adicionales para contratar Profesional.");
      return;
    }
    toast.error(`No se pudo iniciar el pago: ${msg}`);
    return;
  }

  if (data?.url) {
    window.location.href = data.url as string;
    return;
  }
  toast.error("No se recibió una URL de pago válida.");
}

/**
 * Abre el Portal de Cliente de Stripe (gestionar suscripción, método de pago,
 * cancelar). Requiere que el usuario ya tenga un stripe_customer_id.
 */
export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("stripe-portal", { body: {} });

  if (error || !data?.url) {
    const msg = await readEdgeError(error);
    if (msg === "no_customer") {
      toast.info("Aún no tienes una suscripción o compra que gestionar.");
      return;
    }
    toast.error(`No se pudo abrir el portal de suscripción: ${msg}`);
    return;
  }

  window.location.href = data.url as string;
}
