import { Shield, FileCheck, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Legal() {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="bg-slate-900 py-20 text-center text-white">
                <div className="container mx-auto px-4">
                    <h1 className="mb-4 text-4xl font-bold md:text-5xl">Validez Legal de la Firma Electrónica en España</h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-300">
                        FirmaClara cumple con el Reglamento eIDAS y la Ley 6/2020 para garantizar que tus documentos firmados digitalmente tengan plena validez jurídica en España y la Unión Europea.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border p-6 shadow-sm">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Globe className="h-6 w-6" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">Cumplimiento eIDAS</h3>
                        <p className="text-slate-600">
                            Operamos bajo el Reglamento (UE) Nº 910/2014 (eIDAS), asegurando que las firmas electrónicas gestionadas en nuestra plataforma sean legalmente reconocidas en toda la Unión Europea.
                        </p>
                    </div>

                    <div className="rounded-xl border p-6 shadow-sm">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                            <FileCheck className="h-6 w-6" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">Audit Trail Completo</h3>
                        <p className="text-slate-600">
                            Generamos un certificado de evidencias (Audit Trail) para cada documento, registrando IPs, marcas de tiempo, emails y métodos de verificación utilizados en el proceso.
                        </p>
                    </div>

                    <div className="rounded-xl border p-6 shadow-sm">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">Seguridad y Encriptación</h3>
                        <p className="text-slate-600">
                            Tus documentos se almacenan de forma segura y se transmiten mediante conexiones SSL/TLS encriptadas. Utilizamos sellado de tiempo para garantizar la inalterabilidad.
                        </p>
                    </div>
                </div>

                {/* Deep Dive Section */}
                <div className="mt-20">
                    <h2 className="mb-8 text-3xl font-bold text-slate-900">Preguntas frecuentes sobre la validez legal de la firma electrónica</h2>
                    <div className="space-y-6">
                        <div className="rounded-lg bg-slate-50 p-6">
                            <h4 className="mb-2 text-lg font-semibold">¿Es válida una firma electrónica avanzada?</h4>
                            <p className="text-slate-600">
                                Sí. Según el artículo 25 del reglamento eIDAS, no se denegarán efectos jurídicos ni admisibilidad como prueba en procedimientos judiciales a una firma electrónica por el mero hecho de ser electrónica.
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-6">
                            <h4 className="mb-2 text-lg font-semibold">¿Qué pruebas aportamos?</h4>
                            <p className="text-slate-600">
                                Aportamos un documento probatorio que vincula al firmante con el documento firmado, incluyendo: hash del documento original, hash del documento firmado, trazabilidad del envío y la apertura, y verificación OTP (si activada).
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-6">
                            <h4 className="mb-2 text-lg font-semibold">¿Qué tipos de firma electrónica existen según eIDAS?</h4>
                            <p className="text-slate-600">
                                El reglamento eIDAS define tres niveles: firma electrónica simple (SES), firma electrónica avanzada (AES) y firma electrónica cualificada (QES). FirmaClara ofrece firma electrónica simple, que es válida legalmente para la mayoría de contratos y acuerdos comerciales entre particulares y empresas.
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-6">
                            <h4 className="mb-2 text-lg font-semibold">¿FirmaClara es una alternativa a DocuSign en España?</h4>
                            <p className="text-slate-600">
                                Sí. FirmaClara está diseñada específicamente para autónomos y pymes en España, con precios más accesibles (desde 1,50€/documento), sin cuotas mensuales, y con soporte en español. Incluye verificación OTP, asistente IA y certificado de auditoría.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <p className="mb-6 text-slate-600">¿Tienes más dudas legales?</p>
                    <Button asChild size="lg">
                        <Link to="/help">Contactar Soporte</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
