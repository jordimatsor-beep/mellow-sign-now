import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, MessageCircle, FileQuestion, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const { user } = useAuth(); // Assuming useAuth is available or I need to import it. It's not imported in original file!
  // Wait, checking imports... original file has NO useAuth.
  // I need to add useAuth import.

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Initialize email when user loads (if useAuth is present)
  // I will add the hook call. 

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSending(true);
    try {
      const { error } = await withTimeout(
        supabase.functions.invoke('contact-support', {
          body: {
            email: supportEmail,
            message: supportMessage,
            user_email: user?.email
          }
        }),
        3000, "Contact support"
      );

      if (error) throw error;

      toast.success("Mensaje enviado a soporte");
      setIsContactOpen(false);
      setSupportMessage("");
    } catch (error: any) {
      console.error(error);
      toast.error("Error al enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      setSupportEmail(user.email);
    }
  }, [user]);

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
                <p className="text-sm font-medium">Asistente Virtual</p>
              </CardContent>
            </Card>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Asistente FirmaClara</SheetTitle>
              <SheetDescription>
                Pregunta a nuestra IA sobre cómo usar la plataforma o redactar documentos.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <ClaraChat
                endpoint="support-chat"
                initialMessage="Hola, soy tu asistente de soporte. ¿En qué puedo ayudarte hoy? (Dudas sobre créditos, legalidad, problemas técnicos...)"
              />
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Contactar Soporte</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contactar con Soporte</DialogTitle>
              <DialogDescription>
                Escríbenos tu consulta y te responderemos a la mayor brevedad posible a <strong>soporte@operiatech.es</strong>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Tu Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Mensaje</Label>
                <textarea
                  id="contact-message"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe tu problema o duda..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsContactOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSending}>
                  {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar mensaje
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
