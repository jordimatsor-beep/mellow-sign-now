import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, RefreshCcw, Search, ChevronLeft, ChevronRight, ScrollText, Filter } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

// Event type labels & colors for display
const EVENT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    // Admin actions
    "admin.credits.add": { label: "Créditos añadidos (admin)", emoji: "💳", color: "bg-green-100 text-green-700" },
    "admin.role.change": { label: "Rol cambiado (admin)", emoji: "🛡️", color: "bg-purple-100 text-purple-700" },
    "admin.user.rename": { label: "Nombre cambiado (admin)", emoji: "✏️", color: "bg-blue-100 text-blue-700" },
    // User actions
    "credit.purchase": { label: "Compra de créditos", emoji: "🛒", color: "bg-emerald-100 text-emerald-700" },
    "credit.consume": { label: "Crédito consumido", emoji: "🔥", color: "bg-orange-100 text-orange-700" },
    "credit.welcome": { label: "Créditos de bienvenida", emoji: "🎁", color: "bg-pink-100 text-pink-700" },
    "document.create": { label: "Documento creado", emoji: "📄", color: "bg-blue-100 text-blue-700" },
    "document.send": { label: "Documento enviado", emoji: "📤", color: "bg-cyan-100 text-cyan-700" },
    "document.sign": { label: "Documento firmado", emoji: "✅", color: "bg-green-100 text-green-700" },
    "document.view": { label: "Documento visto", emoji: "👁️", color: "bg-gray-100 text-gray-600" },
    "document.cancel": { label: "Documento cancelado", emoji: "❌", color: "bg-red-100 text-red-700" },
    "user.login": { label: "Inicio de sesión", emoji: "🔐", color: "bg-indigo-100 text-indigo-700" },
    "user.register": { label: "Registro", emoji: "🆕", color: "bg-teal-100 text-teal-700" },
};

function getEventDisplay(eventType: string) {
    return EVENT_LABELS[eventType] || { label: eventType, emoji: "📋", color: "bg-gray-100 text-gray-600" };
}

interface LogEntry {
    id: string;
    event_type: string;
    user_email: string | null;
    document_id: string | null;
    created_at: string | null;
}

// Campos de event_data que NO deben mostrarse (datos de usuarios/firmantes)
const SENSITIVE_EVENT_FIELDS = new Set([
    "signer_email", "signer_name", "signer_phone", "signer_tax_id",
    "document_title", "title", "file_url", "signed_file_url",
    "certificate_url", "custom_message", "email", "phone",
]);

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    useEffect(() => {
        fetchLogs();
    }, [page, filterType]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Contar total para paginación (sin exponer datos sensibles)
            let countQuery = supabase.from("event_logs").select("*", { count: "exact", head: true });
            if (filterType && filterType !== "all") {
                const prefix = filterType === "admin" ? "admin.%"
                    : filterType === "credit" ? "credit.%"
                    : filterType === "document" ? "document.%"
                    : "user.%";
                countQuery = countQuery.like("event_type", prefix);
            }
            const { count } = await countQuery;
            setTotalCount(count || 0);

            // Obtener logs via RPC segura (sin event_data ni document_title)
            const { data, error } = await supabase.rpc("admin_get_logs", {
                page_size: PAGE_SIZE,
                page_offset: page * PAGE_SIZE,
                event_type_filter: (filterType && filterType !== "all")
                    ? (filterType === "admin" ? null : null)  // RPC filtra por tipo exacto; usamos null para filtrar en cliente
                    : null,
            });

            if (error) throw error;

            let result: LogEntry[] = (data || []) as LogEntry[];

            // Filtro de tipo por cliente (el RPC no soporta LIKE, solo igualdad)
            if (filterType && filterType !== "all") {
                result = result.filter(l => l.event_type.startsWith(filterType + "."));
            }

            setLogs(result);
        } catch (error: any) {
            console.error("Error fetching logs:", error);
            toast.error("Error cargando logs: " + (error.message || "Unknown"));
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const filtered = search.trim()
        ? logs.filter(l =>
            (l.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
            l.event_type.toLowerCase().includes(search.toLowerCase())
        )
        : logs;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Registro de Actividad</h2>
                    <p className="text-muted-foreground">{totalCount} eventos registrados</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
                    <RefreshCcw className="h-4 w-4" /> Actualizar
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por email, tipo de evento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                    <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los eventos</SelectItem>
                        <SelectItem value="admin">🛡️ Acciones Admin</SelectItem>
                        <SelectItem value="credit">💳 Créditos</SelectItem>
                        <SelectItem value="document">📄 Documentos</SelectItem>
                        <SelectItem value="user">👤 Usuarios</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Logs List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="animate-spin h-6 w-6 text-red-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No hay eventos registrados</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filtered.map(log => {
                                const display = getEventDisplay(log.event_type);
                                return (
                                    <div key={log.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-base">{display.emoji}</span>
                                                    <Badge variant="outline" className={`text-xs ${display.color}`}>
                                                        {display.label}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {log.user_email}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-muted-foreground">
                                                    {log.created_at
                                                        ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })
                                                        : "—"}
                                                </p>
                                                {log.document_id && (
                                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        Doc: {log.document_id.slice(0, 8)}...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Página {page + 1} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
