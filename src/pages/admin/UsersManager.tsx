import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLogger";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Search, CreditCard, RefreshCcw, ShieldCheck, Mail, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 10;

interface UserRow {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
    name: string | null;
    company_name: string | null;
    phone: string | null;
    onboarding_completed: boolean | null;
    credits_available: number;
    document_count: number;
}

export default function UsersManager() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [creditDialogOpen, setCreditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [creditAmount, setCreditAmount] = useState("5");
    const [processing, setProcessing] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    useEffect(() => {
        fetchUsers();
    }, [page]);

    // Reset page when search changes
    useEffect(() => {
        setPage(0);
    }, [search]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Get total count first (for pagination info)
            const { count, error: countError } = await supabase
                .from("users")
                .select("*", { count: "exact", head: true });

            if (countError) throw countError;
            setTotalCount(count || 0);

            // Fetch current page of users
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false })
                .range(from, to);

            if (usersError) throw usersError;

            // Fetch credits and docs only for these users (efficient!)
            const userIds = (usersData || []).map(u => u.id);

            const [creditsRes, docsRes] = await Promise.all([
                supabase.from("user_credit_purchases")
                    .select("user_id, credits_total, credits_used")
                    .in("user_id", userIds),
                supabase.from("documents")
                    .select("user_id")
                    .in("user_id", userIds),
            ]);

            const creditsByUser: Record<string, number> = {};
            (creditsRes.data || []).forEach(c => {
                creditsByUser[c.user_id] = (creditsByUser[c.user_id] || 0) + ((c.credits_total || 0) - (c.credits_used || 0));
            });

            const docsByUser: Record<string, number> = {};
            (docsRes.data || []).forEach(d => {
                docsByUser[d.user_id] = (docsByUser[d.user_id] || 0) + 1;
            });

            const enriched: UserRow[] = (usersData || []).map(u => ({
                ...u,
                credits_available: creditsByUser[u.id] || 0,
                document_count: docsByUser[u.id] || 0,
            }));

            setUsers(enriched);
        } catch (error: any) {
            console.error("Error fetching users:", error);
            toast.error("Error cargando usuarios: " + (error.message || "Unknown"));
        } finally {
            setLoading(false);
        }
    };

    // Client-side filter on current page
    const filtered = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(u =>
            u.email.toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q) ||
            (u.company_name || "").toLowerCase().includes(q)
        );
    }, [users, search]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const openCreditDialog = (user: UserRow) => {
        setSelectedUser(user);
        setCreditAmount("5");
        setCreditDialogOpen(true);
    };

    const handleAddCredits = async () => {
        if (!selectedUser) return;
        const num = parseInt(creditAmount);
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
            setCreditDialogOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleRole = async (user: UserRow) => {
        // CRIT-4: Prevent admin from demoting themselves
        if (user.id === currentUser?.id) {
            toast.error("No puedes cambiar tu propio rol");
            return;
        }
        const newRole = user.role === "admin" ? "user" : "admin";
        const { error } = await supabase.from("users").update({ role: newRole }).eq("id", user.id);
        if (error) {
            toast.error("Error cambiando rol: " + error.message);
        } else {
            toast.success(`Rol cambiado a '${newRole}' para ${user.email}`);
            logAdminAction("admin.role.change", { target_email: user.email, target_id: user.id, old_role: user.role, new_role: newRole });
            fetchUsers();
        }
    };

    const startEditing = (user: UserRow) => {
        setEditingUserId(user.id);
        setEditingName(user.name || "");
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditingName("");
    };

    const handleSaveName = async (userId: string) => {
        const trimmed = editingName.trim();
        if (!trimmed) { toast.error("El nombre no puede estar vacío"); return; }
        const { error } = await supabase.from("users").update({ name: trimmed }).eq("id", userId);
        if (error) {
            toast.error("Error guardando nombre: " + error.message);
        } else {
            toast.success("Nombre actualizado");
            logAdminAction("admin.user.rename", { target_id: userId, new_name: trimmed });
            setEditingUserId(null);
            fetchUsers();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground">{totalCount} usuarios registrados</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
                    <RefreshCcw className="h-4 w-4" /> Actualizar
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre, email o empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="animate-spin h-6 w-6 text-red-500" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-center">Créditos</TableHead>
                                    <TableHead className="text-center">Documentos</TableHead>
                                    <TableHead>Registro</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No se encontraron usuarios
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div>
                                                {editingUserId === user.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(user.id); if (e.key === 'Escape') cancelEditing(); }}
                                                            className="h-7 text-sm w-40"
                                                            autoFocus
                                                        />
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => handleSaveName(user.id)}>
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={cancelEditing}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group">
                                                        <p className="font-medium text-sm">{user.name || user.company_name || "Sin nombre"}</p>
                                                        <button onClick={() => startEditing(user)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" /> {user.email}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "admin" ? "destructive" : "secondary"} className="text-xs">
                                                {user.role === "admin" ? "Admin" : "Usuario"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold text-sm ${user.credits_available < 1 ? "text-red-500" : "text-green-600"}`}>
                                                {user.credits_available}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium">{user.document_count}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: es }) : "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => openCreditDialog(user)}
                                                >
                                                    <CreditCard className="h-3 w-3" /> Créditos
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => handleToggleRole(user)}
                                                >
                                                    <ShieldCheck className="h-3 w-3" /> {user.role === "admin" ? "Quitar Admin" : "Dar Admin"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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

            {/* Add Credits Dialog */}
            <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Créditos</DialogTitle>
                        <DialogDescription>
                            Añadir créditos a <strong>{selectedUser?.email}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Créditos actuales</Label>
                            <p className="text-2xl font-bold text-green-600">{selectedUser?.credits_available || 0}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Cantidad a añadir</Label>
                            <div className="flex gap-2 mb-2">
                                {[1, 5, 10, 25, 50].map(n => (
                                    <Button
                                        key={n}
                                        variant={creditAmount === String(n) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCreditAmount(String(n))}
                                    >
                                        {n}
                                    </Button>
                                ))}
                            </div>
                            <Input
                                type="number"
                                min="1"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddCredits} disabled={processing} className="bg-green-600 hover:bg-green-700">
                            {processing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            Añadir {creditAmount} Créditos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
