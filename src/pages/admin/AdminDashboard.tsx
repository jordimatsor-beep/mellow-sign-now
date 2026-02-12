import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CreditCard, Activity, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardMetrics {
    totalUsers: number;
    totalDocuments: number;
    documentsSigned: number;
    documentsPending: number;
    documentsExpired: number;
    totalCreditsIssued: number;
    totalCreditsUsed: number;
    recentUsers: { id: string; email: string; name: string | null; created_at: string | null }[];
    recentDocuments: { id: string; title: string; status: string | null; created_at: string | null; signer_email: string | null }[];
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            // Parallel queries for speed
            const [usersRes, docsRes, creditsRes] = await Promise.all([
                supabase.from("users").select("id, email, name, created_at, role").order("created_at", { ascending: false }).limit(1000),
                supabase.from("documents").select("id, title, status, created_at, signer_email").order("created_at", { ascending: false }).limit(1000),
                supabase.from("user_credit_purchases").select("credits_total, credits_used").limit(5000),
            ]);

            const users = usersRes.data || [];
            const docs = docsRes.data || [];
            const credits = creditsRes.data || [];

            const totalCreditsIssued = credits.reduce((sum, c) => sum + (c.credits_total || 0), 0);
            const totalCreditsUsed = credits.reduce((sum, c) => sum + (c.credits_used || 0), 0);

            setMetrics({
                totalUsers: users.length,
                totalDocuments: docs.length,
                documentsSigned: docs.filter(d => d.status === "signed").length,
                documentsPending: docs.filter(d => d.status === "sent" || d.status === "pending").length,
                documentsExpired: docs.filter(d => d.status === "expired").length,
                totalCreditsIssued,
                totalCreditsUsed,
                recentUsers: users.slice(0, 5),
                recentDocuments: docs.slice(0, 8),
            });
        } catch (error) {
            console.error("Error fetching admin metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!metrics) return <p className="p-8 text-muted-foreground">Error cargando métricas.</p>;

    const creditsAvailable = metrics.totalCreditsIssued - metrics.totalCreditsUsed;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Vista general de FirmaClara</p>
                </div>
                <div className="text-xs text-muted-foreground bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Sistema Activo
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link to="/shobdgohs/users">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
                            <Users className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{metrics.totalUsers}</div>
                            <p className="text-xs text-muted-foreground mt-1">Registrados en la plataforma</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Documentos</CardTitle>
                        <FileText className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.totalDocuments}</div>
                        <p className="text-xs text-muted-foreground mt-1">Creados en FirmaClara</p>
                    </CardContent>
                </Card>

                <Link to="/shobdgohs/credits">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Disponibles</CardTitle>
                            <CreditCard className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{creditsAvailable}</div>
                            <p className="text-xs text-muted-foreground mt-1">{metrics.totalCreditsUsed} usados de {metrics.totalCreditsIssued} emitidos</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Firma</CardTitle>
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {metrics.totalDocuments > 0
                                ? Math.round((metrics.documentsSigned / metrics.totalDocuments) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{metrics.documentsSigned} firmados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Document Status Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" /> Firmados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{metrics.documentsSigned}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" /> Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{metrics.documentsPending}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" /> Expirados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.documentsExpired}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Panels */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" /> Últimos Registros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {metrics.recentUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium">{u.name || "Sin nombre"}</p>
                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {u.created_at ? format(new Date(u.created_at), "dd MMM", { locale: es }) : "-"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" /> Documentos Recientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {metrics.recentDocuments.map(d => (
                                <div key={d.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{d.title}</p>
                                        <p className="text-xs text-muted-foreground">{d.signer_email || "—"}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "signed" ? "bg-green-100 text-green-700" :
                                        d.status === "sent" || d.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                            d.status === "expired" ? "bg-red-100 text-red-700" :
                                                "bg-gray-100 text-gray-600"
                                        }`}>
                                        {d.status === "signed" ? "Firmado" :
                                            d.status === "sent" ? "Enviado" :
                                                d.status === "pending" ? "Pendiente" :
                                                    d.status === "expired" ? "Expirado" :
                                                        d.status === "draft" ? "Borrador" :
                                                            d.status || "—"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
