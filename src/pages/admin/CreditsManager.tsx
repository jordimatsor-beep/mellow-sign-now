import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, PlusCircle, Search, History, User, Gift } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserCompact {
    id: string;
    email: string;
    name: string | null;
    firmas_creditos: number | null;
}

interface GiftTransaction {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string | null;
    amount: number;
    description: string | null;
    created_at: string;
}

function parseDesc(desc: string | null): { title: string; note: string } {
    try {
        const p = JSON.parse(desc ?? "");
        return { title: p.title || "Créditos de regalo", note: p.note || "" };
    } catch {
        return { title: "Créditos de regalo", note: "" };
    }
}

export default function CreditsManager() {
    const [users, setUsers] = useState<UserCompact[]>([]);
    const [recentGifts, setRecentGifts] = useState<GiftTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserCompact | null>(null);
    const [amount, setAmount] = useState("5");
    const [giftTitle, setGiftTitle] = useState("");
    const [giftMessage, setGiftMessage] = useState("");
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, txRes] = await Promise.all([
                supabase.from("users").select("id, email, name, firmas_creditos").order("email"),
                supabase
                    .from("credit_transactions")
                    .select("id, user_id, amount, description, created_at")
                    .eq("type", "gift")
                    .gt("amount", 0)
                    .order("created_at", { ascending: false })
                    .limit(30),
            ]);

            if (usersRes.error) throw usersRes.error;
            if (txRes.error) throw txRes.error;

            const emailMap: Record<string, { email: string; name: string | null }> = {};
            (usersRes.data ?? []).forEach(u => { emailMap[u.id] = { email: u.email, name: u.name }; });

            const enriched: GiftTransaction[] = (txRes.data ?? []).map(tx => ({
                ...tx,
                user_email: emailMap[tx.user_id]?.email ?? tx.user_id,
                user_name: emailMap[tx.user_id]?.name ?? null,
            }));

            setUsers(usersRes.data ?? []);
            setRecentGifts(enriched);
        } catch (e: any) {
            console.error("[CreditsManager] fetchData error:", e);
            toast.error("Error: " + (e?.message ?? "desconocido"));
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
            const { error } = await supabase.rpc("admin_add_credits", {
                p_target_user_id: selectedUser.id,
                p_credits: num,
                p_note: "admin_gift",
                p_title: giftTitle.trim() || null,
                p_message: giftMessage.trim() || null,
            });
            if (error) throw error;
            toast.success(`${num} créditos añadidos a ${selectedUser.email}`);
            setAmount("5");
            setGiftTitle("");
            setGiftMessage("");
            setSelectedUser(null);
            setSearch("");
            fetchData();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Créditos</h2>
                <p className="text-muted-foreground">Asigna créditos manualmente a cualquier usuario</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Formulario */}
                <Card className="border-2 border-green-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5 text-green-600" /> Asignar Créditos
                        </CardTitle>
                        <CardDescription>Busca un usuario y añádele créditos con mensaje personalizado</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Búsqueda */}
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

                        {/* Lista de usuarios */}
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
                                        <span className="text-sm font-semibold text-primary tabular-nums">
                                            {u.firmas_creditos ?? 0} crd.
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Usuario seleccionado */}
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
                                        <p className="text-2xl font-bold text-green-600">{selectedUser.firmas_creditos ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">créditos actuales</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Cantidad */}
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

                        {/* Título personalizado */}
                        <div className="space-y-2">
                            <Label>
                                Título del regalo <span className="text-muted-foreground font-normal">(opcional)</span>
                            </Label>
                            <Input
                                placeholder="Ej: ¡Bienvenido a FirmaClara!"
                                value={giftTitle}
                                onChange={(e) => setGiftTitle(e.target.value.slice(0, 80))}
                                maxLength={80}
                            />
                        </div>

                        {/* Mensaje personalizado */}
                        <div className="space-y-2">
                            <Label>
                                Mensaje <span className="text-muted-foreground font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                                placeholder="Ej: Te enviamos estos créditos como agradecimiento por tu confianza."
                                value={giftMessage}
                                onChange={(e) => setGiftMessage(e.target.value.slice(0, 300))}
                                maxLength={300}
                                rows={3}
                                className="resize-none text-sm"
                            />
                            <p className="text-right text-xs text-muted-foreground">{giftMessage.length}/300</p>
                        </div>

                        {/* Preview */}
                        {selectedUser && (giftTitle || giftMessage) && (
                            <div className="rounded-lg border border-green-200 bg-green-50/60 p-3 space-y-1">
                                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Vista previa (usuario verá)</p>
                                <div className="flex items-start gap-2 mt-1">
                                    <Gift className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-900">
                                            {giftTitle || "Créditos de regalo"}
                                        </p>
                                        {giftMessage && (
                                            <p className="text-xs text-green-700 mt-0.5">{giftMessage}</p>
                                        )}
                                        <p className="text-xs text-green-600/70 mt-1">
                                            +{amount} créditos · hoy
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                            onClick={handleAddCredits}
                            disabled={processing || !selectedUser}
                            size="lg"
                        >
                            {processing
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <PlusCircle className="h-4 w-4" />
                            }
                            Añadir {amount} Créditos
                        </Button>
                    </CardContent>
                </Card>

                {/* Historial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" /> Historial Reciente
                        </CardTitle>
                        <CardDescription>Últimas asignaciones de créditos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {recentGifts.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6">No hay asignaciones todavía</p>
                            )}
                            {recentGifts.map(tx => {
                                const { title } = parseDesc(tx.description);
                                return (
                                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <Gift className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{tx.user_email}</p>
                                                <p className="text-xs text-muted-foreground truncate">{title}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-green-600">+{tx.amount}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(tx.created_at), "dd/MM HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
