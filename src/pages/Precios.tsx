import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePlanStatus, type PlanId } from "@/hooks/usePlanStatus";
import { startPlanCheckout, openBillingPortal, type PlanChoice } from "@/lib/billing";

type PlanCard = {
  id: "gratis" | "basico" | "profesional" | "pack";
  name: string;
  tagline: string;
  price: string;
  cadence: string;
  features: string[];
  popular?: boolean;
  footnote?: string;
};

const PLANS: PlanCard[] = [
  {
    id: "gratis",
    name: "Gratis",
    tagline: "Empieza sin coste",
    price: "0 €",
    cadence: "/mes",
    features: ["2 firmas al mes", "Asistente Clara incluido", "Sin tarjeta de crédito"],
  },
  {
    id: "basico",
    name: "Básico",
    tagline: "Para uso regular",
    price: "9 €",
    cadence: "/mes",
    features: ["10 firmas al mes", "Sello de tiempo y auditoría", "Soporte por email"],
  },
  {
    id: "profesional",
    name: "Profesional",
    tagline: "Para uso intensivo",
    price: "19 €",
    cadence: "/mes",
    popular: true,
    features: ["50 firmas al mes", "Firmas extra a 0,40 €", "Personalización de marca", "Soporte prioritario"],
    footnote:
      "A partir de la firma 51 se aplica un cargo adicional de 0,40 €/firma. Puedes ver tu consumo en cualquier momento desde el panel.",
  },
  {
    id: "pack",
    name: "Pack puntual",
    tagline: "Sin compromiso",
    price: "15 €",
    cadence: "una vez",
    features: ["15 firmas que no caducan", "Se suma a cualquier plan", "Se consume antes que tu cuota"],
  },
];

export default function Precios() {
  const { user } = useAuth();
  const { data: status } = usePlanStatus();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [overageOpen, setOverageOpen] = useState(false);
  const [overageAccepted, setOverageAccepted] = useState(false);

  const currentPlan: PlanId | null = user ? status?.plan_id ?? null : null;
  const hasSubscription = currentPlan === "basico" || currentPlan === "profesional";

  const checkout = async (plan: PlanChoice, opts?: { acceptOverage?: boolean }) => {
    setLoadingPlan(plan);
    try {
      await startPlanCheckout(plan, opts);
    } finally {
      setLoadingPlan(null);
    }
  };

  const portal = async () => {
    setLoadingPlan("portal");
    try {
      await openBillingPortal();
    } finally {
      setLoadingPlan(null);
    }
  };

  const confirmProfesional = async () => {
    if (!overageAccepted) return;
    setOverageOpen(false);
    await checkout("profesional", { acceptOverage: true });
  };

  const renderCta = (plan: PlanCard) => {
    const isCurrent = currentPlan === plan.id;
    const busy = loadingPlan !== null;
    const spinner = loadingPlan === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null;

    // GRATIS
    if (plan.id === "gratis") {
      if (!user) {
        return (
          <Button className="w-full" variant="outline" asChild>
            <Link to="/register">Empezar gratis</Link>
          </Button>
        );
      }
      return (
        <Button className="w-full" variant="outline" disabled>
          {isCurrent ? "Tu plan actual" : "Plan Gratis"}
        </Button>
      );
    }

    // PACK PUNTUAL (siempre comprable)
    if (plan.id === "pack") {
      if (!user) {
        return (
          <Button className="w-full" variant="secondary" asChild>
            <Link to="/login">Comprar pack</Link>
          </Button>
        );
      }
      return (
        <Button className="w-full" variant="secondary" onClick={() => checkout("pack")} disabled={busy}>
          {spinner}
          Comprar pack
        </Button>
      );
    }

    // SUSCRIPCIONES (básico / profesional)
    if (!user) {
      return (
        <Button className="w-full" asChild>
          <Link to="/login">Contratar</Link>
        </Button>
      );
    }
    if (isCurrent) {
      return (
        <Button className="w-full" variant="outline" onClick={portal} disabled={busy}>
          {loadingPlan === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Gestionar suscripción
        </Button>
      );
    }
    if (hasSubscription) {
      // Tiene otra suscripción → cambiar de plan vía Portal de Stripe.
      return (
        <Button className="w-full" onClick={portal} disabled={busy}>
          {loadingPlan === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Cambiar a {plan.name}
        </Button>
      );
    }
    // Sin suscripción → contratar.
    if (plan.id === "profesional") {
      return (
        <Button
          className="w-full"
          onClick={() => {
            setOverageAccepted(false);
            setOverageOpen(true);
          }}
          disabled={busy}
        >
          {spinner}
          Contratar
        </Button>
      );
    }
    return (
      <Button className="w-full" onClick={() => checkout("basico")} disabled={busy}>
        {spinner}
        Contratar
      </Button>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={user ? "/dashboard" : "/"}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planes y precios</h1>
          <p className="text-muted-foreground mt-1">
            Paga solo por lo que firmas. Cambia o cancela cuando quieras.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.popular ? "border-primary ring-2 ring-primary/30 shadow-lg" : "border-border",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" /> Más popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute left-0 top-0 rounded-br-lg rounded-tl-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                  Tu plan
                </div>
              )}

              <CardContent className="flex flex-1 flex-col p-6 pt-8">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>

                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.footnote && (
                  <p className="mt-4 text-[11px] leading-snug text-muted-foreground italic">{plan.footnote}</p>
                )}

                <div className="mt-6">{renderCta(plan)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagos seguros con Stripe · Los créditos de pack no caducan · IVA no incluido
      </p>

      {/* Consentimiento de overage para Profesional (PRD §2 / §6.1) */}
      <Dialog open={overageOpen} onOpenChange={setOverageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contratar Profesional</DialogTitle>
            <DialogDescription>
              El plan Profesional incluye 50 firmas al mes por 19 €. A partir de la firma 51, cada firma
              adicional se cobra a 0,40 € y se factura en tu siguiente recibo.
            </DialogDescription>
          </DialogHeader>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <Checkbox
              checked={overageAccepted}
              onCheckedChange={(v) => setOverageAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground">
              Acepto que las firmas que superen las 50 incluidas se cobren a 0,40 €/firma en mi próxima factura.
            </span>
          </label>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setOverageOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmProfesional} disabled={!overageAccepted || loadingPlan === "profesional"}>
              {loadingPlan === "profesional" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continuar al pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
