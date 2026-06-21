import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Minus, Gift, CreditCard, Loader2, RefreshCw, Receipt, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCredits } from "@/hooks/useCredits";
import { SubscriptionCard } from "@/components/plan/SubscriptionCard";

interface CreditTransaction {
  id: string;
  type: "purchase" | "usage" | "gift" | "refund" | "expiry";
  amount: number;
  description: string;
  document_id: string | null;
  document_title: string | null;
  created_at: string;
}

interface CreditPurchase {
  id: string;
  pack_type: string;
  credits_total: number;
  price_paid: number | null;
  stripe_payment_id: string | null;
  purchased_at: string | null;
  created_at: string | null;
}

// Nombres legibles de los packs/planes para el historial de compras.
const PACK_NAMES: Record<string, string> = {
  free_trial: "Bienvenida (gratis)",
  trial: "Prueba (gratis)",
  basic: "Pack Básico",
  pro: "Pack Profesional",
  professional: "Pack Profesional",
  business: "Pack Business",
};

function packName(type: string) {
  return PACK_NAMES[type] || type;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
  } catch {
    return dateString;
  }
}

export default function Credits() {
  const { credits: availableCredits, isLoading: loading } = useCredits();
  const [openingPortal, setOpeningPortal] = useState(false);

  // Movimientos de crédito (consumo, regalos, reembolsos) — incluye el enlace
  // al documento (QW-03).
  const { data: transactions = [], isLoading: loadingHistory } = useQuery({
    queryKey: queryKeys.credits.transactions,
    queryFn: async () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase.rpc("get_credit_transactions", { p_limit: 50 });
          if (error) throw error;
          return (data as CreditTransaction[]) || [];
        })(),
        3000,
        "Transactions fetch"
      ),
  });

  // ME-06: ledger de compras (packs adquiridos), incluido el de bienvenida.
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["credit_purchases"],
    queryFn: async () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from("user_credit_purchases")
            .select("id, pack_type, credits_total, price_paid, stripe_payment_id, purchased_at, created_at")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return (data as CreditPurchase[]) || [];
        })(),
        3000,
        "Purchases fetch"
      ),
  });

  // Solo débitos en la pestaña "Consumo".
  const usageTx = transactions.filter((t) => t.amount < 0);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "usage":
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      case "purchase":
        return <CreditCard className="h-4 w-4 text-primary" />;
      case "gift":
        return <Gift className="h-4 w-4 text-green-600" />;
      case "refund":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Abre el portal de facturación de Stripe (se despliega aparte). Si aún no
  // está disponible, lo comunica sin romper nada.
  const openBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal");
      const url = (data as { url?: string } | null)?.url;
      if (error || !url) throw new Error("portal_unavailable");
      window.location.href = url;
    } catch {
      toast.info("La gestión de facturas estará disponible muy pronto.");
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Créditos</h1>
      </div>

      {/* Balance card */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardContent className="flex flex-col items-center py-8">
          <Coins className="mb-2 h-10 w-10" />
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <p className="text-4xl font-bold">{availableCredits}</p>
          )}
          <p className="text-primary-foreground/80">créditos disponibles</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/precios">Comprar más</Link>
          </Button>
        </CardContent>
      </Card>

      <SubscriptionCard />

      <Separator />

      {/* Historial con pestañas Consumo / Compras (ME-06) */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="usage" className="flex-1">Consumo</TabsTrigger>
          <TabsTrigger value="purchases" className="flex-1">Compras</TabsTrigger>
        </TabsList>

        {/* Consumo */}
        <TabsContent value="usage" className="mt-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usageTx.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Coins className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="font-medium">Sin consumo todavía</p>
              <p className="text-sm">Aquí verás cada envío que descuente créditos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {usageTx.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {getTransactionIcon(item.type)}
                    </div>
                    <div>
                      {/* QW-03: enlace al documento si sigue existiendo */}
                      {item.document_id && item.document_title ? (
                        <Link
                          to={`/documents/${item.document_id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {item.document_title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{item.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{item.amount}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Compras */}
        <TabsContent value="purchases" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={openingPortal}>
              {openingPortal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-4 w-4" />
              )}
              Facturas y facturación
            </Button>
          </div>

          {loadingPurchases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="font-medium">Sin compras todavía</p>
              <p className="text-sm">Cuando compres un pack, aparecerá aquí con su factura.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => {
                const isFree = !p.price_paid || Number(p.price_paid) === 0;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {isFree ? <Gift className="h-4 w-4 text-green-600" /> : <CreditCard className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{packName(p.pack_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.credits_total} créditos · {formatDate(p.purchased_at || p.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        {isFree ? "Gratis" : `${Number(p.price_paid).toFixed(2)} €`}
                      </span>
                      {p.stripe_payment_id && (
                        <button
                          onClick={openBillingPortal}
                          className="block text-xs text-primary hover:underline"
                        >
                          <span className="inline-flex items-center gap-0.5">
                            Factura <ExternalLink className="h-3 w-3" />
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
