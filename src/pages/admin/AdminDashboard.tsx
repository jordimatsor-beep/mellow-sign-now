import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Activity } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const { profile } = useAuth();

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Control (Stealth)</h2>
                <div className="text-sm text-muted-foreground">
                    Bienvenido, {profile?.name || "Admin"}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Link to="/shobdgohs/users">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Gestión</div>
                            <p className="text-xs text-muted-foreground">Ver todos los usuarios registrados</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/shobdgohs/credits">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Créditos</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Asignar</div>
                            <p className="text-xs text-muted-foreground">Recarga manual de saldos</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Activo</div>
                        <p className="text-xs text-muted-foreground">Todo funciona correctamente</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
