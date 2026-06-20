import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Euro, CheckCircle, Clock, RefreshCcw } from "lucide-react";

interface PayoutRow {
  id: string;
  user_id: string;
  amount_eur: number;
  iban: string;
  status: string;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
  user_email?: string;
  user_name?: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:    { label: "Pendiente",   variant: "default" },
  processing: { label: "Procesando",  variant: "secondary" },
  paid:       { label: "Pagado",      variant: "outline" },
  rejected:   { label: "Rechazado",   variant: "destructive" },
};

export default function PayoutsManager() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  useEffect(() => { fetchPayouts(); }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enriquecer con datos del usuario
      const userIds = [...new Set((data ?? []).map((p: PayoutRow) => p.user_id))];
      let userMap: Record<string, { email: string; name: string }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, name")
          .in("id", userIds);
        (users ?? []).forEach((u: { id: string; email: string; name: string }) => {
          userMap[u.id] = { email: u.email, name: u.name };
        });
      }

      setPayouts((data ?? []).map((p: PayoutRow) => ({
        ...p,
        user_email: userMap[p.user_id]?.email ?? "—",
        user_name:  userMap[p.user_id]?.name  ?? "—",
      })));
    } catch {
      toast.error("Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (payout: PayoutRow) => {
    setProcessingId(payout.id);
    try {
      const { error } = await supabase.functions.invoke("admin-mark-payout-paid", {
        body: {
          payout_id: payout.id,
          notes: noteInputs[payout.id] || null,
        },
      });
      if (error) throw error;

      toast.success(`✓ ${payout.amount_eur.toFixed(2)} € marcado como pagado`);
      fetchPayouts();
    } catch {
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingId(null);
    }
  };

  const pending = payouts.filter(p => p.status === "pending");
  const rest    = payouts.filter(p => p.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Euro className="h-6 w-6 text-emerald-600" />
            Pagos de afiliados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solicitudes de transferencia bancaria pendientes de procesar
          </p>
        </div>
        <Button variant="outline" onClick={fetchPayouts} disabled={loading} className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Importe pendiente</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {pending.reduce((s, p) => s + Number(p.amount_eur), 0).toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total pagado</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {rest.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount_eur), 0).toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Pendientes */}
          {pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <p className="font-medium">Sin pagos pendientes</p>
                <p className="text-sm">Todo al día.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pendientes de pagar ({pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pending.map((payout) => (
                  <div key={payout.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold">{payout.user_name} <span className="text-muted-foreground font-normal text-sm">— {payout.user_email}</span></p>
                        <p className="text-xs text-muted-foreground font-mono">{payout.iban}</p>
                        <p className="text-xs text-muted-foreground">
                          Solicitado {format(new Date(payout.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 shrink-0">{Number(payout.amount_eur).toFixed(2)} €</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Referencia de transferencia (opcional)"
                        className="text-sm h-8"
                        value={noteInputs[payout.id] ?? ""}
                        onChange={(e) => setNoteInputs(prev => ({ ...prev, [payout.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="shrink-0 bg-emerald-600 hover:bg-emerald-700 gap-2"
                        onClick={() => markPaid(payout)}
                        disabled={processingId === payout.id}
                      >
                        {processingId === payout.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <CheckCircle className="h-4 w-4" />
                        }
                        Marcar pagado
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          {rest.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rest.map((payout) => {
                    const s = STATUS_LABELS[payout.status] ?? { label: payout.status, variant: "secondary" as const };
                    return (
                      <div key={payout.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{payout.user_name} <span className="text-muted-foreground font-normal">— {payout.user_email}</span></p>
                          <p className="text-xs text-muted-foreground font-mono">{payout.iban}</p>
                          {payout.notes && <p className="text-xs text-muted-foreground mt-0.5">Ref: {payout.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="font-semibold">{Number(payout.amount_eur).toFixed(2)} €</p>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
