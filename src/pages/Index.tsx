import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LegalModal } from "@/components/LegalModals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  FileText,
  Clock,
  Hash,
  MapPin,
  X,
  MessageCircle,
  Zap,
  CreditCard,
  AlertTriangle,
  Scale,
  PenTool,
  Sparkles,
  Receipt,
  Wrench
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Index() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Banner */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-sm">
        <span className="opacity-90">Firma electrónica con validez legal</span>
        <span className="mx-2">→</span>
        <Link to="/register" className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity">
          Prueba gratis
        </Link>
      </div>

      {/* Navigation Header - Compact */}
      <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
          {/* Logo + Service name */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/multicentro-logo.jpg" 
                alt="Multicentro" 
                className="h-10 w-auto object-contain"
              />
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <span className="text-sm font-bold text-primary hidden sm:block">Firma Digital</span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium ml-6">
              <a href="#casos" className="text-muted-foreground hover:text-foreground transition-colors">Casos de uso</a>
              <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
              <a href="#precios" className="text-muted-foreground hover:text-foreground transition-colors">Precios</a>
            </nav>
          </div>

          {/* Right side - Powered by + CTAs */}
          <div className="flex items-center gap-4">
            {/* Powered by Operia - SOLO aquí */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-r pr-4">
              <span>Powered by</span>
              <span className="font-bold">OPERIA</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Ingresar</Link>
              </Button>
              <Button size="sm" className="rounded-full px-4" asChild>
                <Link to="/register">
                  Prueba gratis
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Compact 2-column */}
      <section className="py-8 lg:py-12 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-6 items-center max-w-6xl mx-auto">
            {/* Left - Content */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl leading-tight">
                Aprueba presupuestos y cierra acuerdos{" "}
                <span className="text-primary">en 1 minuto</span>
              </h1>

              <p className="mt-3 text-base text-muted-foreground">
                Envía presupuestos, partes de trabajo o contratos. Tu cliente firma desde el móvil y ambos recibís el documento certificado.
              </p>

              {/* CTA Buttons */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="h-11 px-6" asChild>
                  <Link to="/register">
                    Empezar Gratis (2 envíos)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-6" asChild>
                  <a href="#como-funciona">Ver cómo funciona</a>
                </Button>
              </div>

              {/* Trust indicators - compact */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> Validez legal
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> Créditos no caducan
                </span>
              </div>
            </div>

            {/* Right - Visual card */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-xs">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                      <PenTool className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Firma en 1 minuto</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tu cliente firma desde su móvil sin descargar nada
                    </p>
                    <div className="flex justify-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" /> SHA-256
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> TSA
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Scale className="h-3.5 w-3.5" /> eIDAS
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases - 3 Cards - NEW SECTION */}
      <section className="py-8 lg:py-10 bg-muted/30" id="casos">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold tracking-tight text-center mb-6 sm:text-2xl">
              Para todo tu negocio
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Ventas */}
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Ventas</h3>
                  <p className="text-sm text-muted-foreground">
                    Envía presupuestos y ciérralos en la misma llamada.
                  </p>
                </CardContent>
              </Card>

              {/* Operaciones */}
              <Card className="border-success/20">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mb-3">
                    <Wrench className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Operaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Firma partes de trabajo y entregas al instante.
                  </p>
                </CardContent>
              </Card>

              {/* Legal */}
              <Card className="border-warning/20">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 mb-3">
                    <Scale className="h-5 w-5 text-warning" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Legal</h3>
                  <p className="text-sm text-muted-foreground">
                    Contratos con plena validez eIDAS.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Clara IA Feature - Compact */}
      <section className="py-8 lg:py-10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* Content */}
              <div>
                <div className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary mb-3">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Inteligencia Artificial
                </div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Crea documentos con <span className="text-primary">Clara</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  ¿No tienes PDF? Describe lo que necesitas y Clara genera el documento.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>Presupuestos, NDAs, contratos...</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>Personalizado con tus datos</span>
                  </li>
                </ul>
              </div>

              {/* Visual */}
              <div className="flex justify-center">
                <Card className="w-full max-w-xs border-primary/30 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Clara</p>
                        <p className="text-xs text-muted-foreground">Asistente inteligente</p>
                      </div>
                    </div>
                    <div className="text-sm bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground italic text-xs">"Necesito un presupuesto para reforma de baño..."</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Clara está generando...
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution - Compact */}
      <section className="py-8 lg:py-10 bg-background" id="como-funciona">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold tracking-tight text-center mb-6 sm:text-2xl">
              Del caos a la claridad
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Before */}
              <Card className="border-destructive/30 bg-destructive/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-0.5 rounded-br-lg">
                  ANTES
                </div>
                <CardContent className="p-4 pt-7">
                  <h3 className="font-bold text-destructive flex items-center gap-2 mb-3 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    El caos de siempre
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    {["Email → Imprimir → Firmar → Escanear → Reenviar"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sin contar "se me olvidó" o "no tengo escáner"
                  </p>
                </CardContent>
              </Card>

              {/* After */}
              <Card className="border-success/30 bg-success/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-success text-success-foreground text-xs font-bold px-2.5 py-0.5 rounded-br-lg">
                  AHORA
                </div>
                <CardContent className="p-4 pt-7">
                  <h3 className="font-bold text-success flex items-center gap-2 mb-3 text-sm">
                    <Zap className="h-4 w-4" />
                    Así de simple
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    {["Subes PDF → Cliente recibe link → Firma en móvil → Listo"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sin papel, sin excusas, sin complicaciones
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Semaphore - Compact */}
      <section className="py-8 lg:py-10 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Validez Legal <span className="text-primary">eIDAS</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {/* SÍ sirve */}
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-success" />
                    <h3 className="font-bold text-success text-sm">SÍ es válido</h3>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {["Presupuestos", "Contratos servicios", "NDAs", "Albaranes"].map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-success shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* NO sirve */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-4 w-4 text-destructive" />
                    <h3 className="font-bold text-destructive text-sm">NO es válido</h3>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {["Hipotecas", "Compraventa inmuebles", "Testamentos"].map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <X className="h-3 w-3 text-destructive shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Evidencias */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-primary text-sm">Evidencias</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary shrink-0" />
                      <span>SHA-256</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-success shrink-0" />
                      <span>Timestamp TSA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span>IP + Dispositivo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Security - Horizontal compact */}
      <section className="py-8 lg:py-10 bg-gradient-to-r from-success/5 to-success/10">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Content */}
              <div className="flex-1">
                <div className="inline-flex items-center rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-success mb-2">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Seguridad extra
                </div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Verificación WhatsApp
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Código OTP a su móvil para mayor seguridad.
                </p>
              </div>

              {/* Mini mockup */}
              <div className="w-36 rounded-xl border-4 border-slate-800 bg-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#075e54] px-2 py-1.5 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-white/20" />
                  <p className="text-white font-medium text-xs">Multicentro</p>
                </div>
                <div className="bg-[#e5ddd5] p-2">
                  <div className="bg-white rounded-lg p-2 shadow-sm text-center">
                    <p className="text-xs">🔐 Tu código:</p>
                    <p className="text-lg font-bold tracking-widest text-primary">847291</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Compact */}
      <section className="py-8 lg:py-10 bg-background" id="precios">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-warning mb-2">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Sin suscripciones • No caducan
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Precios transparentes
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {/* Pack Prueba */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm">Pack Prueba</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">0€</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /><strong>2 envíos</strong> gratis</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />Todas las funciones</li>
                  </ul>
                  <Button className="w-full mt-3" variant="outline" size="sm" asChild>
                    <Link to="/register">Empezar</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Básico */}
              <Card className="border-primary shadow-lg relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm">Pack Básico</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">12€</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /><strong>10 envíos</strong></li>
                    <li className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" />Clara IA</li>
                  </ul>
                  <Button className="w-full mt-3" size="sm" asChild>
                    <Link to="/register">Comprar</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Pro */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm">Pack Pro</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">29€</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /><strong>30 envíos</strong></li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />Recordatorios auto</li>
                  </ul>
                  <Button className="w-full mt-3" variant="outline" size="sm" asChild>
                    <Link to="/register">Comprar</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-3">
              IVA incluido. Los créditos no caducan nunca.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA - Compact */}
      <section className="py-8 lg:py-10 bg-primary text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="text-xl font-bold sm:text-2xl">
            ¿Listo para cerrar acuerdos más rápido?
          </h2>
          <p className="mt-2 text-sm text-primary-foreground/80 max-w-md mx-auto">
            Cierra presupuestos y firma documentos en 1 minuto.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-4 h-10 px-6"
            asChild
          >
            <Link to="/register">
              Crear mi cuenta gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer - Compact */}
      <footer className="py-8 bg-foreground text-background/70">
        <div className="container px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src="/multicentro-logo.jpg" 
                  alt="Multicentro" 
                  className="h-8 w-auto object-contain bg-white rounded px-2 py-1"
                />
                <Separator orientation="vertical" className="h-6 bg-background/20" />
                <span className="text-sm font-bold text-background">Firma Digital</span>
              </div>
              <p className="text-xs text-background/60 max-w-xs">
                Servicio de firma electrónica del ecosistema Multicentro.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-background mb-2 text-sm">Producto</h4>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#casos" className="hover:text-background transition-colors">Casos de uso</a></li>
                <li><a href="#como-funciona" className="hover:text-background transition-colors">Cómo funciona</a></li>
                <li><a href="#precios" className="hover:text-background transition-colors">Precios</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-background mb-2 text-sm">Legal</h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <LegalModal
                    trigger={<button className="hover:text-background transition-colors">Términos</button>}
                    title="Términos y Condiciones"
                    type="terms"
                  />
                </li>
                <li>
                  <LegalModal
                    trigger={<button className="hover:text-background transition-colors">Privacidad</button>}
                    title="Política de Privacidad"
                    type="privacy"
                  />
                </li>
                <li className="flex items-center gap-1">
                  <Scale className="h-3 w-3" /> eIDAS
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
            <p>&copy; 2024 Multicentro. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
