import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Zap, Building2, Store } from "lucide-react";

interface SolutionsModalProps {
    trigger: React.ReactNode;
    type: "freelance" | "sme" | "retail";
}

export function SolutionsModal({ trigger, type }: SolutionsModalProps) {
    const getContent = () => {
        switch (type) {
            case "freelance":
                return {
                    title: "Soluciones para Autónomos",
                    description: "Agilidad y legalidad sin costes fijos.",
                    icon: <Zap className="h-6 w-6 text-warning" />,
                    content: (
                        <div className="space-y-6">
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Todo en tu móvil
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Envía presupuestos y contratos de servicio directamente desde tu smartphone.
                                    Tu cliente firma en segundos, y tú recibes la notificación al instante para empezar a trabajar.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Sin ataduras
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Paga solo por lo que usas o elige nuestros planes flexibles.
                                    Perfecto para flujos de trabajo estacionales.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Validez Legal (eIDAS)
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Tus documentos firmados tienen plena validez jurídica ante cualquier reclamación de impago.
                                    Protege tu trabajo con la máxima seguridad.
                                </p>
                            </section>
                        </div>
                    )
                };
            case "sme":
                return {
                    title: "Soluciones para Pymes",
                    description: "Control, organización y cumplimiento normativo.",
                    icon: <Building2 className="h-6 w-6 text-primary" />,
                    content: (
                        <div className="space-y-6">
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Gestión de RRHH
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Contratos laborales, acuerdos de confidencialidad, y registrosarios firmados digitalmente.
                                    Ahorra horas de gestión administrativa y papel.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Departamento Comercial
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Unifica los modelos de contrato de tu equipo de ventas.
                                    Evita cláusulas obsoletas y ten visibilidad total del estado de las operaciones.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Cumplimiento RGPD
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Recaba el consentimiento expreso de tus clientes y empleados de forma auditada y segura,
                                    cumpliendo estrictamente con la normativa europea de protección de datos.
                                </p>
                            </section>
                        </div>
                    )
                };
            case "retail":
                return {
                    title: "Soluciones para Comercios",
                    description: "Digitaliza tu mostrador y agiliza entregas.",
                    icon: <Store className="h-6 w-6 text-success" />,
                    content: (
                        <div className="space-y-6">
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Firma Presencial (Tablet)
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Olvídate de imprimir y archivar tickets o resguardos.
                                    Tu cliente firma en una tablet en el mostrador y recibe su copia por email automáticamente.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Servicios Técnicos y Reparaciones
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Documenta la entrada de equipos a reparar con fotos y firma de conformidad del estado.
                                    Evita reclamaciones posteriores sobre daños preexistentes.
                                </p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    Albaranes de Entrega
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Justificantes de entrega firmados en el momento, con geolocalización y sellado de tiempo
                                    para garantizar la trazabilidad de tus envíos.
                                </p>
                            </section>
                        </div>
                    )
                };
        }
    };

    const data = getContent();

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-muted rounded-lg">
                            {data.icon}
                        </div>
                        <DialogTitle className="text-xl">{data.title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-base text-muted-foreground">
                        {data.description}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-2 pr-4">
                    {data.content}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
