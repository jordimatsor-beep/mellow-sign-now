import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface UserData {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
    name: string | null;
    credits_total?: number; // Fetched from credit_packs
    credits_used?: number;
}

export default function UsersManager() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();

        // Subscribe to changes
        const channel = supabase
            .channel('public:users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchUsers = async () => {
        try {
            // Fetch users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // Fetch credit purchases for all users
            const { data: purchasesData, error: purchasesError } = await supabase
                .from('user_credit_purchases')
                .select('*');

            if (purchasesError) console.error("Error fetching credits:", purchasesError);

            const combinedData = usersData.map(user => {
                // Aggregate credits for this user
                const userPurchases = purchasesData?.filter(p => p.user_id === user.id) || [];
                const total = userPurchases.reduce((acc, curr) => acc + (curr.credits_total || 0), 0);
                const used = userPurchases.reduce((acc, curr) => acc + (curr.credits_used || 0), 0);

                return {
                    ...user,
                    credits_total: total,
                    credits_used: used
                };
            });

            setUsers(combinedData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Registrados ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Créditos (Restantes)</TableHead>
                                <TableHead>Fecha Registro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>{user.name || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? "destructive" : "secondary"}>
                                            {user.role || 'user'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className={user.credits_total && (user.credits_total - (user.credits_used || 0)) < 2 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                                            {user.credits_total ? (user.credits_total - (user.credits_used || 0)) : 0}
                                        </span>
                                        <span className="text-muted-foreground text-xs ml-1">
                                            ({user.credits_used || 0} usados)
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {user.created_at ? format(new Date(user.created_at), "PPP", { locale: es }) : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
