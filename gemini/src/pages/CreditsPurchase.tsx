import { Link } from "react-router-dom";
import { ArrowLeft, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const packs = [
  {
    id: "basic",
    name: "Básico",
    credits: 10,
    price: 12,
    pricePerCredit: 1.2,
    popular: false,
  },
  {
    id: "pro",
    name: "Profesional",
    credits: 30,
    price: 29,
    pricePerCredit: 0.97,
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    credits: 100,
    price: 69,
    pricePerCredit: 0.69,
    popular: false,
  },
];

export default function CreditsPurchase() {
  return (
    <div className="container space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/credits">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Comprar créditos</h1>
      </div>

      {/* Packs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Elige tu pack</h2>
        
        {packs.map((pack) => (
          <Card
            key={pack.id}
            className={`relative overflow-hidden transition-colors hover:bg-accent ${
              pack.popular ? "ring-2 ring-primary" : ""
            }`}
          >
            {pack.popular && (
              <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-2 py-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                  <span className="text-xs font-medium text-primary-foreground">Popular</span>
                </div>
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{pack.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pack.credits} contratos
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pack.pricePerCredit.toFixed(2)}€ por contrato
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{pack.price}€</p>
                  <Button size="sm" className="mt-2">
                    Elegir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-muted p-4">
        <div className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 text-success" />
          <p className="text-sm text-muted-foreground">
            Los créditos <strong className="text-foreground">no caducan</strong>. Úsalos cuando los necesites.
          </p>
        </div>
      </div>
    </div>
  );
}
