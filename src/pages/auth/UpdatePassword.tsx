import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function UpdatePassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if we have a session (handled by Supabase auto-login from link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, the link might be invalid or expired
                toast.error("El enlace de recuperación es inválido o ha expirado.");
                navigate("/login");
            }
        };
        checkSession();
    }, [navigate]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("Contraseña actualizada correctamente");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Restablecer contraseña"
            subtitle="Ingresa tu nueva contraseña para acceder a tu cuenta"
            mode="login"
        >
            <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nueva Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11"
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                    />
                </div>
                <Button className="w-full h-11 text-base" type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Actualizar contraseña
                </Button>
            </form>
        </AuthLayout>
    );
}
