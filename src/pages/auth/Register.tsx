import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: email.split('@')[0],
                    }
                }
            });

            if (error) throw error;

            setIsSuccess(true);
            toast.success("Cuenta creada exitosamente");
        } catch (error: any) {
            toast.error(error.message || "Error al crear la cuenta");
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                    <Card className="text-center border-none shadow-xl">
                        <CardContent className="pt-12 pb-10 space-y-6">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-green-100 p-4">
                                    <MailCheck className="h-12 w-12 text-green-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight">¡Casi estamos!</h2>
                                <p className="text-muted-foreground max-w-[80%] mx-auto">
                                    Hemos enviado un enlace de confirmación a <span className="font-medium text-foreground">{email}</span>.
                                    Revisa tu bandeja de entrada para activar tu cuenta.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => navigate('/login')}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Login
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md animate-in zoom-in-95 duration-500 shadow-lg border-muted/40">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        Crear cuenta
                    </CardTitle>
                    <CardDescription className="text-center">
                        Empieza a firmar documentos digitalmente
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="hola@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                                minLength={6}
                            />
                        </div>
                        <Button className="w-full h-11 text-base" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrarse
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 border-t bg-slate-50/50 p-6">
                    <div className="text-center text-sm text-muted-foreground">
                        ¿Ya tienes una cuenta?{" "}
                        <Link to="/login" className="font-medium text-primary hover:underline">
                            Iniciar sesión
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
