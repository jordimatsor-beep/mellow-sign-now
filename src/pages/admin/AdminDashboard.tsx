import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CreditCard, Activity, TrendingUp, CheckCircle, Clock, AlertTriangle, Euro, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
    revenue: number;
    revenue_growth: number;
    active_users: number;
    credits_sold: number;
    docs_signed: number;
    chart_data: { date: string; revenue: number; credits: number }[];
    top_customers: { email: string; company_name: string; total_spend: number; total_credits: number }[];
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [period, setPeriod] = useState("30d");
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, [period]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc('get_admin_stats', { p_period: period });
            if (error) throw error;
            console.log("Admin Stats:", data);
            setStats(data as AdminStats);
        } catch (error: any) {
            console.error("Error fetching admin stats:", error);
            setError(error.message || "Error desconocido cargando métricas");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="space-y-8 p-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="rounded-full bg-red-100 p-3">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Error cargando métricas</h3>
                    <p className="text-muted-foreground max-w-md">{error}</p>
                    <button
                        onClick={() => fetchStats()}
                        className="text-sm text-primary hover:underline hover:text-primary/80"
                    >
                        Reintentar
                    </button>
                    {error.includes("function") && (
                        <p className="text-xs text-muted-foreground mt-4 bg-gray-100 p-2 rounded">
                            Parece que falta la migración de base de datos.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard General</h2>
                    <p className="text-muted-foreground">Vista comercial y operativa de FirmaClara</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Sistema Activo
                    </div>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="30d">Últimos 30 días</SelectItem>
                            <SelectItem value="year">Este Año</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Business KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                        <Euro className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-700">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats.revenue)}
                        </div>
                        <p className={`text-xs mt-1 font-medium ${stats.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.revenue_growth > 0 ? '+' : ''}{stats.revenue_growth}% vs periodo anterior
                        </p>
                    </CardContent>
                </Card>

                <Link to="/shobdgohs/users">
                    <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Activos</CardTitle>
                            <Users className="h-5 w-5 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{stats.active_users}</div>
                            <p className="text-xs text-muted-foreground mt-1">Han interactuado en este periodo</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="hover:shadow-lg transition-all border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Documentos Firmados</CardTitle>
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-700">{stats.docs_signed}</div>
                        <p className="text-xs text-muted-foreground mt-1">Completados en este periodo</p>
                    </CardContent>
                </Card>

                <Link to="/shobdgohs/credits">
                    <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Vendidos</CardTitle>
                            <CreditCard className="h-5 w-5 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-700">{stats.credits_sold}</div>
                            <p className="text-xs text-muted-foreground mt-1">Unidades compradas</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Revenue Chart (Main - 4 cols) */}
                <Card className="md:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" /> Evolución de Ingresos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.chart_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => format(new Date(str), period === 'today' ? 'HH:mm' : 'dd MMM', { locale: es })}
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `€${value}`}
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <Tooltip
                                        formatter={(value: any) => [new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value), 'Ingresos']}
                                        labelFormatter={(label) => format(new Date(label), "d MMMM yyyy, HH:mm", { locale: es })}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Credits Sold Chart (Side - 3 cols) */}
                <Card className="md:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-amber-500" /> Venta de Créditos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chart_data}>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => format(new Date(str), period === 'today' ? 'HH:mm' : 'dd', { locale: es })}
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="credits" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Créditos" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Customers Panel */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" /> Mejores Clientes (Top Spenders)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.top_customers.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No hay datos de ventas en este periodo.</p>
                            ) : (
                                stats.top_customers.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm
                                                ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    i === 1 ? 'bg-gray-100 text-gray-700' :
                                                        i === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-blue-50 text-blue-700'}
                                            `}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{c.company_name || "Particular"}</p>
                                                <p className="text-xs text-muted-foreground">{c.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-600">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c.total_spend)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{c.total_credits} créditos</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
