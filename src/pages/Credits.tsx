import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Plus, Minus, Gift, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const creditHistory = [
  { id: "1", type: "usage", description: "Presupuesto web", amount: -1, date: "20/01/2025" },
  { id: "2", type: "usage", description: "Contrato diseño", amount: -1, date: "18/01/2025" },
  { id: "3", type: "purchase", description: "Pack Básico (10)", amount: 10, date: "15/01/2025" },
  { id: "4", type: "gift", description: "Pack prueba", amount: 2, date: "10/01/2025" },
];

export default function Credits() {
  const availableCredits = 8;

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
          <p className="text-4xl font-bold">{availableCredits}</p>
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
        <div className="space-y-2">
          {creditHistory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    item.type === "usage"
                      ? "bg-muted"
                      : item.type === "purchase"
                      ? "bg-primary/10"
                      : "bg-success/10"
                  }`}
                >
                  {item.type === "usage" ? (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  ) : item.type === "purchase" ? (
                    <CreditCard className="h-4 w-4 text-primary" />
                  ) : (
                    <Gift className="h-4 w-4 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold ${
                  item.amount > 0 ? "text-success" : "text-muted-foreground"
                }`}
              >
                {item.amount > 0 ? `+${item.amount}` : item.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
