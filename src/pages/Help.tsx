import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, MessageCircle, FileQuestion, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClaraChat } from "@/components/ClaraChat";

const faqs = [
  {
    question: "¿Qué validez legal tiene la firma?",
    answer:
      "FirmaClara genera firma electrónica simple con certificado de evidencias, válida legalmente según el reglamento eIDAS. Es suficiente para contratos comerciales del día a día, aunque no equivale a firma notarial ni firma cualificada.",
  },
  {
    question: "¿Cómo funciona el sistema de créditos?",
    answer:
      "Cada documento que envías para firmar consume 1 crédito. Los créditos no caducan. Puedes comprar packs de créditos desde 10 hasta 100 unidades con descuentos por volumen.",
  },
  {
    question: "¿Qué pasa si el firmante no firma a tiempo?",
    answer:
      "Si el plazo expira, el documento se marca como 'Expirado'. Puedes reenviar el documento al firmante creando un nuevo envío, que consumirá otro crédito.",
  },
  {
    question: "¿Puedo editar un documento después de enviarlo?",
    answer:
      "No, una vez enviado el documento no se puede modificar para garantizar la integridad del proceso. Si necesitas hacer cambios, puedes cancelar el envío actual y crear uno nuevo.",
  },
  {
    question: "¿Cómo descargo el certificado de firma?",
    answer:
      "Una vez firmado el documento, ve al detalle del documento y encontrarás los botones para descargar tanto el PDF firmado como el certificado de evidencias con todos los datos técnicos.",
  },
];

export default function Help() {
  return (
    <div className="container space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Ayuda</h1>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Chat de soporte</p>
              </CardContent>
            </Card>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Soporte FirmaClara</SheetTitle>
              <SheetDescription>
                Habla con nuestro asistente virtual para resolver tus dudas.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <ClaraChat />
            </div>
          </SheetContent>
        </Sheet>

        <a href="mailto:support@firmaclara.es" className="block">
          <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Enviar email</p>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* FAQs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-sm">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
