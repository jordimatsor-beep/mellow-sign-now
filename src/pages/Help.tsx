import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SupportChat, type SupportChatHandle } from "@/components/SupportChat";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const chatRef = useRef<SupportChatHandle>(null);

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

      {/* Contact options */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Live chat */}
        <button onClick={() => chatRef.current?.open()} className="block w-full text-left">
          <Card className="cursor-pointer transition-colors hover:bg-accent border-primary/20 h-full">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MessageCircleMore className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Chat en directo</p>
                <p className="text-xs text-muted-foreground">Respuesta inmediata del equipo</p>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Email */}
        <a href="mailto:hola@firmaclara.es" className="block">
          <Card className="cursor-pointer transition-colors hover:bg-accent border-primary/20 h-full">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Contactar por email</p>
                <p className="text-xs text-muted-foreground">hola@firmaclara.es</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Hidden SupportChat instance driven by the card button above */}
      <SupportChat ref={chatRef} hideTriggerButton />

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
