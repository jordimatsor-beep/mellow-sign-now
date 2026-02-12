import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PlusCircle, Search, History, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserCompact {
    id: string;
    email: string;
    name: string | null;
    credits_available: number;
}

interface CreditPurchase {
    id: string;
    user_id: string;
    user_email?: string;
    pack_type: string;
    credits_total: number;
    credits_used: number | null;
    price_paid: number | null;
    created_at: string | null;
}

export default function CreditsManager() {
    const [users, setUsers] = useState<UserCompact[]>([]);
    const [recentPurchases, setRecentPurchases] = useState<CreditPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserCompact | null>(null);
    const [amount, setAmount] = useState("5");
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, creditsRes, purchasesRes] = await Promise.all([
                supabase.from("users").select("id, email, name").order("email"),
                supabase.from("user_credit_purchases").select("user_id, credits_total, credits_used"),
                supabase.from("user_credit_purchases").select("*").order("created_at", { ascending: false }).limit(20),
            ]);

            // Aggregate credits per user
            const creditsByUser: Record<string, number> = {};
            (creditsRes.data || []).forEach(c => {
                creditsByUser[c.user_id] = (creditsByUser[c.user_id] || 0) + ((c.credits_total || 0) - (c.credits_used || 0));
            });

            const enrichedUsers = (usersRes.data || []).map(u => ({
                ...u,
                credits_available: creditsByUser[u.id] || 0,
            }));
            setUsers(enrichedUsers);

            // Enrich purchases with user email
            const emailMap: Record<string, string> = {};
            (usersRes.data || []).forEach(u => { emailMap[u.id] = u.email; });
            const enrichedPurchases = (purchasesRes.data || []).map(p => ({
                ...p,
                user_email: emailMap[p.user_id] || p.user_id,
            }));
            setRecentPurchases(enrichedPurchases);
        } catch (error) {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(u =>
            u.email.toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q)
        );
    }, [users, search]);

    const handleAddCredits = async () => {
        if (!selectedUser) { toast.error("Selecciona un usuario"); return; }
        const num = parseInt(amount);
        if (isNaN(num) || num <= 0) { toast.error("Cantidad inválida"); return; }

        setProcessing(true);
        try {
            const { data, error } = await supabase.rpc("admin_add_credits", {
                p_target_user_id: selectedUser.id,
                p_credits: num,
                p_note: "admin_gift",
            });
            if (error) throw error;
            toast.success(`${num} créditos añadidos a ${selectedUser.email}`);
            // Logging is handled server-side by the RPC
            setAmount("5");
            setSelectedUser(null);
            setSearch("");
            fetchData();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-red-500" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Créditos</h2>
                <p className="text-muted-foreground">Asigna créditos manualmente a cualquier usuario</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Add Credits Form */}
                <Card className="border-2 border-green-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5 text-green-600" /> Asignar Créditos
                        </CardTitle>
                        <CardDescription>Busca un usuario y añádele créditos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* User Search */}
                        <div className="space-y-2">
                            <Label>Buscar Usuario</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nombre o email..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* User List / Selector */}
                        {search.trim() && !selectedUser && (
                            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                                {filteredUsers.length === 0 && (
                                    <p className="text-sm text-muted-foreground p-3">No se encontró ningún usuario</p>
                                )}
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => { setSelectedUser(u); setSearch(u.email); }}
                                        className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{u.name || "Sin nombre"}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {u.credits_available} créditos
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected User Card */}
                        {selectedUser && (
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                                        <User className="h-5 w-5 text-blue-700" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{selectedUser.name || selectedUser.email}</p>
                                        <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-green-600">{selectedUser.credits_available}</p>
                                        <p className="text-xs text-muted-foreground">créditos actuales</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label>Cantidad de Créditos</Label>
                            <div className="flex gap-2">
                                {[1, 5, 10, 25, 50, 100].map(n => (
                                    <Button
                                        key={n}
                                        variant={amount === String(n) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setAmount(String(n))}
                                        className="flex-1"
                                    >
                                        {n}
                                    </Button>
                                ))}
                            </div>
                            <Input
                                type="number"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="O escribe una cantidad personalizada..."
                            />
                        </div>

                        {/* Submit */}
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                            onClick={handleAddCredits}
                            disabled={processing || !selectedUser}
                            size="lg"
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            Añadir {amount} Créditos
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" /> Historial Reciente
                        </CardTitle>
                        <CardDescription>Últimas asignaciones de créditos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {recentPurchases.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay transacciones</p>
                            )}
                            {recentPurchases.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{p.user_email}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.pack_type === "admin_gift" ? "🎁 Regalo Admin" :
                                                p.pack_type === "free_trial" ? "🆓 Bienvenida" :
                                                    p.pack_type}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-600">+{p.credits_total}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.created_at ? format(new Date(p.created_at), "dd/MM HH:mm", { locale: es }) : "—"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
