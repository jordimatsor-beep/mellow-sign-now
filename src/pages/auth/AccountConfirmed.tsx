import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountConfirmed() {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate("/dashboard");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
                    ¡Cuenta verificada!
                </h1>

                <p className="mb-8 text-slate-600">
                    Gracias por confirmar tu correo electrónico. Tu cuenta de FirmaClara está ahora completamente activa.
                </p>

                <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => navigate("/dashboard")}
                >
                    Ir al Dashboard
                    <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="mt-6 text-sm text-slate-400">
                    Redirigiendo en {countdown} segundos...
                </p>
            </div>
        </div>
    );
}
