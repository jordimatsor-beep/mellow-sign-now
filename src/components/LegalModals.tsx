import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, CheckCircle, FileCheck, Lock, Award, Globe } from "lucide-react";

interface LegalModalProps {
    trigger: React.ReactNode;
    title: string;
    type: "terms" | "privacy" | "contact" | "legal";
}

export function LegalModal({ trigger, title, type }: LegalModalProps) {
    const getContent = () => {
        switch (type) {
            case "terms":
                return (
                    <div className="space-y-4">
                        <p>
                            Bienvenido a FirmaClara. Al utilizar nuestros servicios, usted acepta estos términos y condiciones.
                        </p>
                        <p>
                            <strong>1. Uso del servicio:</strong> FirmaClara proporciona servicios de firma electrónica avanzada conforme al Reglamento (UE) 910/2014 (eIDAS). Usted es responsable de la seguridad de su cuenta y de los documentos que procesa.
                        </p>
                        <p>
                            <strong>2. Validez legal:</strong> Las firmas realizadas a través de nuestra plataforma tienen plena validez jurídica según el artículo 25 del reglamento eIDAS.
                        </p>
                        <p>
                            <strong>3. Conservación de evidencias:</strong> Generamos y almacenamos un certificado de evidencias (Audit Trail) para cada documento firmado, garantizando la trazabilidad del proceso.
                        </p>
                        <p>
                            <strong>4. Jurisdicción:</strong> Estos términos se rigen por las leyes de España y la normativa de la Unión Europea.
                        </p>
                    </div>
                );
            case "privacy":
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-600 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Cumplimiento RGPD - Reglamento (UE) 2016/679
                        </div>
                        <p>
                            En FirmaClara, nos tomamos muy en serio su privacidad. Esta política describe cómo recopilamos, usamos y protegemos sus datos personales conforme al Reglamento General de Protección de Datos (RGPD).
                        </p>
                        <p>
                            <strong>Datos que recopilamos:</strong> Nombre, email, teléfono (para OTP), documentos subidos, IP y marcas de tiempo para el Audit Trail.
                        </p>
                        <p>
                            <strong>Finalidad:</strong> Prestación del servicio de firma, autenticación, generación de evidencias legales y comunicaciones transaccionales.
                        </p>
                        <p>
                            <strong>Sus derechos:</strong> Acceso, rectificación, supresión, portabilidad y oposición. Contacte: support@firmaclara.es
                        </p>
                        <p>
                            <strong>Retención:</strong> Conservamos las evidencias de firma durante el período legalmente requerido (mínimo 5 años).
                        </p>
                    </div>
                );
            case "contact":
                return (
                    <div className="space-y-4">
                        <p>
                            Estamos aquí para ayudarle. Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
                        </p>
                        <div className="grid gap-2">
                            <div className="rounded-lg border p-3">
                                <p className="font-semibold">Email de Soporte</p>
                                <a href="mailto:support@firmaclara.es" className="text-primary hover:underline">
                                    support@firmaclara.es
                                </a>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="font-semibold">Delegado de Protección de Datos</p>
                                <a href="mailto:dpo@firmaclara.es" className="text-primary hover:underline">
                                    dpo@firmaclara.es
                                </a>
                            </div>
                        </div>
                    </div>
                );
            case "legal":
                return (
                    <div className="space-y-5">
                        {/* Certification Header */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-lg">
                                <Award className="h-5 w-5" />
                                Plataforma Certificada
                            </div>
                            <p className="text-green-600 text-sm mt-1">
                                FirmaClara cumple con los estándares europeos de firma electrónica
                            </p>
                        </div>

                        {/* eIDAS */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <Globe className="h-4 w-4 text-blue-600" />
                                Cumplimiento eIDAS
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Operamos bajo el Reglamento (UE) Nº 910/2014 (eIDAS), garantizando que las firmas electrónicas gestionadas sean legalmente reconocidas en toda la Unión Europea.
                            </p>
                        </div>

                        {/* Art. 25 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <Shield className="h-4 w-4 text-purple-600" />
                                Artículo 25 - Efectos Jurídicos
                            </div>
                            <p className="text-sm text-muted-foreground">
                                "No se denegarán efectos jurídicos ni admisibilidad como prueba en procedimientos judiciales a una firma electrónica por el mero hecho de ser electrónica."
                            </p>
                        </div>

                        {/* Audit Trail */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <FileCheck className="h-4 w-4 text-green-600" />
                                Certificado de Evidencias (Audit Trail)
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Generamos un documento probatorio que incluye: hash del documento, trazabilidad del envío/apertura, verificación OTP, IP del firmante, y sellado de tiempo TSA.
                            </p>
                        </div>

                        {/* Security */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <Lock className="h-4 w-4 text-amber-600" />
                                Seguridad y Encriptación
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Transmisión SSL/TLS, almacenamiento cifrado, y sellado de tiempo con autoridades TSA reconocidas para garantizar la inalterabilidad.
                            </p>
                        </div>

                        {/* Footer badge */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                <Shield className="h-3 w-3" /> eIDAS
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                                <Lock className="h-3 w-3" /> SSL/TLS
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                                <CheckCircle className="h-3 w-3" /> RGPD
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                <Award className="h-3 w-3" /> TSA
                            </span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {type === "legal" && <Shield className="h-5 w-5 text-green-600" />}
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {type === "legal"
                            ? "Certificaciones y cumplimiento normativo de FirmaClara"
                            : "Información legal y de soporte de FirmaClara"
                        }
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-4">
                    {getContent()}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
