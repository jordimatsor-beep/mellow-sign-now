import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Minus, Gift, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCredits } from "@/hooks/useCredits";

interface CreditTransaction {
  id: string;
  type: "purchase" | "usage" | "gift" | "refund" | "expiry";
  amount: number;
  description: string;
  document_id: string | null;
  created_at: string;
}

export default function Credits() {


  // Fetch available credits using the shared hook
  const { credits: availableCredits, isLoading: loading } = useCredits();

  // Fetch transactions - cached
  const { data: transactions = [], isLoading: loadingHistory } = useQuery({
    queryKey: queryKeys.credits.transactions,
    queryFn: async () => {
      return withTimeout(
        (async () => {
          const { data, error } = await supabase.rpc('get_credit_transactions', { p_limit: 20 });
          if (error) throw error;
          return (data as CreditTransaction[]) || [];
        })(),
        3000, "Transactions fetch"
      );
    },
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

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

  const getTransactionBg = (type: string) => {
    switch (type) {
      case "usage":
      case "expiry":
        return "bg-muted";
      case "purchase":
        return "bg-primary/10";
      case "gift":
      case "refund":
        return "bg-green-100";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="container space-y-6 px-4 py-6">
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
            <Link to="/credits/purchase">Comprar más</Link>
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Historial</h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Sin transacciones</p>
            <p className="text-sm">Tu historial aparecerá aquí cuando uses o compres créditos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getTransactionBg(item.type)}`}>
                    {getTransactionIcon(item.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${item.amount > 0 ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {item.amount > 0 ? `+${item.amount}` : item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
