import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalModalProps {
    trigger: React.ReactNode;
    title: string;
    type: "terms" | "privacy" | "contact";
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
                            <strong>1. Uso del servicio:</strong> FirmaClara proporciona servicios de firma electrónica. Usted es responsable de la seguridad de su cuenta y de los documentos que procesa.
                        </p>
                        <p className="text-muted-foreground italic">
                            Más adelante incluiremos la información completa de los términos y condiciones.
                        </p>
                    </div>
                );
            case "privacy":
                return (
                    <div className="space-y-4">
                        <p>
                            En FirmaClara, nos tomamos muy en serio su privacidad. Esta política describe cómo recopilamos, usamos y protegemos sus datos.
                        </p>
                        <p>
                            <strong>1. Datos recopilados:</strong> Recopilamos información necesaria para proporcionar nuestros servicios, como su nombre, correo electrónico y documentos.
                        </p>
                        <p className="text-muted-foreground italic">
                            Más adelante incluiremos la información completa de la política de privacidad.
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
                                <p className="font-semibold">Email</p>
                                <a href="mailto:support@firmaclara.com" className="text-primary hover:underline">
                                    support@firmaclara.com
                                </a>
                            </div>
                        </div>
                        <p className="text-muted-foreground italic">
                            Más adelante incluiremos la información completa de contacto.
                        </p>
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
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Información legal y de soporte de FirmaClara.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-4">
                    {getContent()}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
