import { Link } from "react-router-dom";
import { ArrowLeft, Check, Star, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buyCredits } from "@/lib/stripe";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type CreditPack = {
  id: string; // uuid
  slug: string; // 'basic', 'pro', 'business'
  name: string;
  credits: number;
  price: number; // in cents
  description: string | null;
  popular: boolean;
  is_active: boolean;
};

export default function CreditsPurchase() {
  const [selectedPack, setSelectedPack] = useState<string>("pro");
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);

  const { data: packs, isLoading, error } = useQuery({
    queryKey: ['credit_packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as CreditPack[];
    }
  });

  const handleBuy = async (packSlug: string) => {
    setBuyingPackId(packSlug);
    try {
      await buyCredits(packSlug);
    } catch (e) {
      console.error(e);
    } finally {
      setBuyingPackId(null);
    }
  };

  // Helper to calculate savings based on the cheapest pack (usually the first one)
  const calculateSavings = (pack: CreditPack, allPacks: CreditPack[]) => {
    if (!allPacks || allPacks.length === 0) return 0;
    const basicPack = allPacks[0]; // Assuming sorted by price ASC
    if (!basicPack || basicPack.credits === 0) return 0;

    const basicPricePerCredit = basicPack.price / basicPack.credits;
    const theoreticalPrice = pack.credits * basicPricePerCredit;
    const savings = theoreticalPrice - pack.price;
    return Math.max(0, Math.round(savings / 100)); // Return in Euros
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-destructive">
        <AlertCircle className="h-10 w-10" />
        <p>Error al cargar los packs de créditos</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="container space-y-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/credits">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Comprar créditos</h1>
      </div>

      {/* Packs */}
      <div className="grid gap-6 md:grid-cols-3">
        {packs?.map((pack) => {
          const isSelected = selectedPack === pack.slug;
          const priceInEur = pack.price / 100;
          const pricePerCredit = priceInEur / pack.credits;
          const savings = calculateSavings(pack, packs);

          return (
            <Card
              key={pack.id}
              onClick={() => setSelectedPack(pack.slug)}
              className={cn(
                "relative cursor-pointer transition-all hover:border-primary/50",
                isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border",
                pack.popular ? "shadow-md" : ""
              )}
            >
              {pack.popular && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Popular
                  </div>
                </div>
              )}

              <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
                <div>
                  <h3 className="text-xl font-bold">{pack.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{priceInEur}€</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pack.credits} créditos ({pricePerCredit.toFixed(2)}€/ud)
                  </p>

                  {savings > 0 && (
                    <div className="mt-3 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Ahorras {savings}€
                    </div>
                  )}

                  {pack.description && (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      {pack.description}
                    </p>
                  )}
                </div>

                <Button
                  className={cn(
                    "w-full mt-6 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPack(pack.slug);
                    handleBuy(pack.slug);
                  }}
                  disabled={!!buyingPackId}
                >
                  {buyingPackId === pack.slug ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                    </>
                  ) : "Comprar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-muted/50 p-4 border border-dashed">
        <div className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Los créditos <strong className="text-foreground">no caducan</strong> mientras tu cuenta esté activa.
          </p>
        </div>
        <div className="flex items-start gap-2 mt-2">
          <Check className="mt-0.5 h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Pago seguro procesado por Stripe. Factura disponible tras la compra.
          </p>
        </div>
      </div>
    </div>
  );
}
