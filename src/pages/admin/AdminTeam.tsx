import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, UserPlus, UserMinus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeamMember {
    id: string;
    email: string;
    name: string | null;
    role: 'admin' | 'support' | 'user';
}

export default function AdminTeam() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, email, name, role")
                .in("role", ["admin", "support"])
                .order("role");
            if (error) throw error;
            setMembers(data as TeamMember[]);
        } catch (error) {
            toast.error("Error cargando equipo");
        } finally {
            setLoading(false);
        }
    };

    const handleSetRole = async (email: string, role: string) => {
        if (!email.trim()) return;
        setProcessing(true);
        try {
            const { data, error } = await supabase.rpc("set_user_role", {
                target_email: email.trim(),
                new_role: role
            });
            if (error) throw error;
            toast.success(`Rol ${role === 'user' ? 'quitado' : role} actualizado para ${email}`);
            setNewEmail("");
            fetchTeam();
        } catch (error: any) {
            toast.error(error.message || "Error asignando rol");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Equipo FirmaClara</h2>
                <p className="text-muted-foreground">Gestiona los accesos de administradores y soporte</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Añadir Miembro</CardTitle>
                        <CardDescription>Asigna el rol de Soporte a un usuario por su email</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email del usuario</label>
                            <Input 
                                placeholder="ejemplo@firmaclara.com" 
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <Button 
                            className="w-full gap-2 bg-red-600 hover:bg-red-700" 
                            onClick={() => handleSetRole(newEmail, 'support')}
                            disabled={processing || !newEmail}
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            Añadir Soporte
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Miembros del Staff</CardTitle>
                        <CardDescription>Usuarios con acceso al panel de control</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-red-500" /></div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    No hay miembros en el equipo
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {members.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{m.name || "Sin nombre"}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {m.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={m.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize text-[10px] font-bold">
                                                        {m.role === 'admin' ? 'Administrador' : 'Soporte'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {m.role !== 'admin' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                                            onClick={() => handleSetRole(m.email, 'user')}
                                                            disabled={processing}
                                                        >
                                                            <UserMinus className="h-3.5 w-3.5 mr-1" /> Revocar Acceso
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
