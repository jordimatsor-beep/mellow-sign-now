import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2, RefreshCcw, Euro, Users, Gift,
  CheckCircle, Clock, Copy, ChevronDown, ChevronUp
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ReferralRow {
  user_id:        string;
  user_email:     string;
  user_name:      string;
  referral_code:  string;
  total_invited:  number;
  total_active:   number;
  credits_earned: number;
  balance_pending: number;
  balance_paid:    number;
  payout_id:      string | null;
  payout_iban:    string | null;
  payout_amount:  number | null;
  payout_created: string | null;
  payout_notes:   string | null;
}

type FilterTab = "all" | "balance" | "payout";

// ── Helpers ──────────────────────────────────────────────────────────────────

function eur(v: number | null) {
  return (v ?? 0).toFixed(2).replace(".", ",") + " €";
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado`));
}

// ── Componente fila expandible ───────────────────────────────────────────────

function ReferralUserRow({
  row,
  onMarkPaid,
  processing,
}: {
  row: ReferralRow;
  onMarkPaid: (id: string, note: string) => void;
  processing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");

  const hasPayout  = !!row.payout_id;
  const hasBalance = row.balance_pending > 0;

  return (
    <div className={`rounded-lg border transition-all ${hasPayout ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10" : "border-border"}`}>
      {/* Fila principal */}
      <div
        className="grid items-center gap-x-3 px-4 py-3 cursor-pointer select-none"
        style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 60px 60px 60px minmax(0,1fr) 32px" }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Usuario */}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{row.user_name}</p>
          <p className="text-xs text-muted-foreground truncate">{row.user_email}</p>
        </div>

        {/* Código */}
        <div
          className="flex items-center gap-1 group"
          onClick={e => { e.stopPropagation(); copyToClipboard(row.referral_code, "Código"); }}
        >
          <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {row.referral_code}
          </span>
          <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* Invitados */}
        <div className="text-center">
          <p className="text-sm font-semibold">{row.total_invited}</p>
          <p className="text-[10px] text-muted-foreground">invitados</p>
        </div>

        {/* Activos */}
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">{row.total_active}</p>
          <p className="text-[10px] text-muted-foreground">activos</p>
        </div>

        {/* Créditos */}
        <div className="text-center">
          <p className="text-sm font-semibold">{row.credits_earned}</p>
          <p className="text-[10px] text-muted-foreground">créditos</p>
        </div>

        {/* Saldo € + badge solicitud */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${hasBalance ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {eur(row.balance_pending)}
          </span>
          {hasPayout && (
            <Badge variant="default" className="bg-amber-500 text-white text-[10px] px-1.5 py-0 shrink-0">
              Solicitud
            </Badge>
          )}
          {!hasPayout && row.balance_paid > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-emerald-600 border-emerald-200">
              Pagado
            </Badge>
          )}
        </div>

        {/* Toggle */}
        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Panel expandido */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded bg-muted/50 p-2.5">
              <p className="text-xs text-muted-foreground">Saldo disponible</p>
              <p className="font-semibold text-emerald-700">{eur(row.balance_pending)}</p>
            </div>
            <div className="rounded bg-muted/50 p-2.5">
              <p className="text-xs text-muted-foreground">Ya pagado</p>
              <p className="font-semibold">{eur(row.balance_paid)}</p>
            </div>
            <div className="rounded bg-muted/50 p-2.5">
              <p className="text-xs text-muted-foreground">Invitados totales</p>
              <p className="font-semibold">{row.total_invited} ({row.total_active} activos)</p>
            </div>
            <div className="rounded bg-muted/50 p-2.5">
              <p className="text-xs text-muted-foreground">Créditos ganados</p>
              <p className="font-semibold">{row.credits_earned} créditos</p>
            </div>
          </div>

          {/* Solicitud de cobro */}
          {hasPayout && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                Solicitud de transferencia
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm flex-1">{row.payout_iban}</span>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => copyToClipboard(row.payout_iban!, "IBAN")}
                  className="h-7 px-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Solicitado {row.payout_created
                    ? format(new Date(row.payout_created), "d MMM yyyy 'a las' HH:mm", { locale: es })
                    : "—"}
                </div>
                <span className="text-lg font-bold text-emerald-700">{eur(row.payout_amount)}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Ref. transferencia (opcional)"
                  className="h-8 text-sm"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() => onMarkPaid(row.payout_id!, note)}
                  disabled={processing}
                >
                  {processing
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <CheckCircle className="h-4 w-4" />
                  }
                  Marcar pagado
                </Button>
              </div>
            </div>
          )}

          {!hasPayout && row.balance_pending === 0 && row.balance_paid > 0 && (
            <p className="text-xs text-muted-foreground italic">
              Saldo al día — {eur(row.balance_paid)} ya transferidos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function PayoutsManager() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_referral_overview");
      if (error) throw error;
      setRows((data ?? []) as ReferralRow[]);
    } catch {
      toast.error("Error al cargar los datos de afiliados");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (payoutId: string, note: string) => {
    setProcessingId(payoutId);
    try {
      const { error } = await supabase.functions.invoke("admin-mark-payout-paid", {
        body: { payout_id: payoutId, notes: note || null },
      });
      if (error) throw error;
      toast.success("Transferencia marcada como pagada — saldo actualizado");
      fetchData();
    } catch {
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtros
  const filtered = useMemo(() => {
    let result = rows;
    if (filter === "balance") result = result.filter(r => r.balance_pending > 0);
    if (filter === "payout")  result = result.filter(r => !!r.payout_id);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.user_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        r.referral_code.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, filter, search]);

  // Totales resumen
  const totalBalance  = rows.reduce((s, r) => s + Number(r.balance_pending), 0);
  const totalPaid     = rows.reduce((s, r) => s + Number(r.balance_paid), 0);
  const totalPayouts  = rows.filter(r => !!r.payout_id).length;

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "Todos",              count: rows.length },
    { key: "balance", label: "Con saldo",           count: rows.filter(r => r.balance_pending > 0).length },
    { key: "payout",  label: "Solicitud pendiente", count: totalPayouts },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Programa de afiliados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visión global de referidos, créditos y comisiones en dinero
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Afiliados</p>
            </div>
            <p className="text-3xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo pendiente</p>
            </div>
            <p className="text-3xl font-bold text-amber-600">{eur(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Solicitudes</p>
            </div>
            <p className="text-3xl font-bold text-amber-600">{totalPayouts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total pagado</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{eur(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-[11px] rounded-full px-1.5 ${
                filter === tab.key ? "bg-white/20" : "bg-muted"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar por nombre, email o código..."
          className="max-w-xs h-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
          <Gift className="h-10 w-10" />
          <p className="font-medium">Sin resultados</p>
          <p className="text-sm">No hay afiliados que coincidan con el filtro.</p>
        </div>
      ) : (
        <>
          {/* Cabecera de columnas */}
          <div
            className="hidden md:grid px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground font-medium"
            style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 60px 60px 60px minmax(0,1fr) 32px" }}
          >
            <span>Usuario</span>
            <span>Código</span>
            <span className="text-center">Invitados</span>
            <span className="text-center">Activos</span>
            <span className="text-center">Créditos</span>
            <span>Saldo €</span>
            <span />
          </div>

          <div className="space-y-2">
            {filtered.map(row => (
              <ReferralUserRow
                key={row.user_id}
                row={row}
                onMarkPaid={markPaid}
                processing={processingId !== null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
