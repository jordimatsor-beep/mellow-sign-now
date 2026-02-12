import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Apple, Banana, Cherry } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StealthLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Optional: Check role immediately or let AdminRoute handle it
            // We just let them "in", AdminRoute will decide if they see Dashboard or Fruit Shop again (if not admin)
            navigate("/shobdgohs/dashboard");
        } catch (error: any) {
            console.error("Login failed:", error);
            toast.error("Error de credenciales de empleado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4 font-mono">
            {/* Retro/Boring Inventory System Look */}
            <div className="max-w-md w-full bg-white border-2 border-orange-200 shadow-[4px_4px_0px_0px_rgba(251,146,60,1)] p-8 rounded-sm">
                <div className="text-center mb-8 border-b-2 border-dashed border-orange-100 pb-4">
                    <div className="flex justify-center gap-2 mb-2 text-orange-500">
                        <Apple size={24} />
                        <Banana size={24} />
                        <Cherry size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-orange-800 uppercase tracking-widest">
                        Frutería Paquita
                    </h1>
                    <p className="text-xs text-orange-600/70 mt-1">
                        Sistema de Gestión de Inventario v1.0
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="employee-id" className="text-xs uppercase text-orange-900 font-bold">
                            ID Empleado (Email)
                        </Label>
                        <Input
                            id="employee-id"
                            type="email"
                            placeholder="empleado@fruteriapaquita.es"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border-orange-200 focus-visible:ring-orange-400 bg-orange-50/30"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pin" className="text-xs uppercase text-orange-900 font-bold">
                            PIN de Acceso (Password)
                        </Label>
                        <Input
                            id="pin"
                            type="password"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border-orange-200 focus-visible:ring-orange-400 bg-orange-50/30"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(153,69,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                        {loading ? "Verificando..." : "Acceder al Almacén"}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-orange-300">
                        © 2024 Frutas S.L. - Solo personal autorizado.
                        <br />
                        Recuerde: Una manzana al día mantiene al doctor en la lejanía.
                    </p>
                </div>
            </div>
        </div>
    );
}
