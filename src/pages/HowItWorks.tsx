import { Upload, Send, PenTool, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HowItWorks() {
    const steps = [
        {
            icon: <Upload className="h-8 w-8 text-blue-600" />,
            title: "1. Sube tu documento",
            description: "Sube cualquier archivo PDF a la plataforma. Nuestro sistema lo procesará y preparará para la firma segura."
        },
        {
            icon: <Send className="h-8 w-8 text-blue-600" />,
            title: "2. Envía al firmante",
            description: "Indica el nombre y email (y opcionalmente teléfono) del firmante. Recibirán una notificación instantánea."
        },
        {
            icon: <PenTool className="h-8 w-8 text-blue-600" />,
            title: "3. Firma sencilla",
            description: "El firmante accede desde cualquier dispositivo (móvil o PC) y firma con un clic o dibujando su rúbrica. Sin instalar nada."
        },
        {
            icon: <CheckCircle className="h-8 w-8 text-blue-600" />,
            title: "4. Certificado Legal",
            description: "Recibes el documento firmado junto con un certificado de auditoría (Audit Trail) que garantiza su validez legal."
        }
    ];

    return (
        <div className="bg-white">
            <div className="bg-slate-50 py-20 text-center">
                <div className="container mx-auto px-4">
                    <h1 className="mb-4 text-4xl font-bold md:text-5xl">Cómo funciona FirmaClara</h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-600">
                        Simplificamos el proceso de firma digital para que cierres acuerdos en minutos, no en días.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-20">
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                                {step.icon}
                            </div>
                            <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
                            <p className="text-slate-600">{step.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-20 rounded-2xl bg-slate-900 p-10 text-center text-white">
                    <h2 className="mb-4 text-3xl font-bold">¿Listo para empezar?</h2>
                    <p className="mb-8 text-slate-300">Prueba la plataforma hoy mismo y envía tu primer documento gratis.</p>
                    <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                        <Link to="/register">Crear cuenta gratis</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
