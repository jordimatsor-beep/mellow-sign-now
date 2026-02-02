import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageCircle } from "lucide-react";

interface ContactSalesDialogProps {
    trigger?: React.ReactNode;
}

export function ContactSalesDialog({ trigger }: ContactSalesDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Contactar Ventas</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center">Contactar con Ventas</DialogTitle>
                    <DialogDescription className="text-center">
                        Nuestro equipo comercial está listo para diseñar un plan a medida para tu empresa.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">Correo Electrónico</p>
                            <a href="mailto:soporte@operiatech.es" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                soporte@operiatech.es
                            </a>
                        </div>
                    </div>

                    <div className="rounded-lg bg-secondary/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Horario de atención</p>
                        <p className="font-medium text-foreground">Lunes a Viernes, 9:00 - 18:00 (CET)</p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button className="w-full" onClick={() => window.location.href = 'mailto:soporte@operiatech.es?subject=Consulta%20Pack%20Empresa%20FirmaClara'}>
                        Abrir correo
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
