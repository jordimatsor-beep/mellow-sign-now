import { Link } from "react-router-dom";
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
  Building2,
  PenTool
} from "lucide-react";
import { PoweredByOperia, MulticentrosLogo, OperiaLogo } from "@/components/brand/BrandHeader";
import { Separator } from "@/components/ui/separator";

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation Header - Fixed height with proper logo containment */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center h-10 py-1">
              <MulticentrosLogo className="h-full max-h-8 w-auto object-contain" />
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <span className="text-base font-semibold text-foreground hidden sm:inline">Firma Digital</span>
          </div>
          <div className="flex items-center gap-4">
            <PoweredByOperia className="hidden md:flex" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">
                  Acceder
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Compact 2-column layout */}
      <section className="py-10 lg:py-16 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Building2 className="mr-2 h-4 w-4" />
                Servicio exclusivo Multicentros
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                Multicentros te trae la{" "}
                <span className="text-primary">firma digital</span> que estabas esperando.
              </h1>

              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Envía contratos desde tu panel de siempre. Un nuevo servicio exclusivo para clientes Multicentros.{" "}
                <strong className="text-foreground">Tecnología certificada por Operia.</strong>
              </p>

              {/* CTA Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
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

              {/* Trust indicators - compact inline */}
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> No caducan
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> Soporte español
                </span>
              </div>
            </div>

            {/* Right - Abstract visual card */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-sm">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6">
                      <PenTool className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Firma en 1 minuto</h3>
                    <p className="text-sm text-muted-foreground mb-4">
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

      {/* Trust Bar - Compact */}
      <section className="py-6 bg-muted/50 border-y">
        <div className="container px-4">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Operia</strong> + <strong className="text-foreground">Multicentros</strong>
            </p>
            <div className="flex items-center gap-4">
              <MulticentrosLogo className="h-8 opacity-70" />
              <span className="text-muted-foreground">+</span>
              <OperiaLogo className="h-5 opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Legal Semaphore - Compact 3-column bento grid */}
      <section className="py-10 lg:py-14 bg-background" id="legalidad">
        <div className="container px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                La Verdad Clara sobre la <span className="text-primary">Firma Electrónica</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Transparencia total • Reglamento eIDAS (Art. 25)
              </p>
            </div>

            {/* Bento Grid - 3 columns */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* SÍ sirve */}
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <h3 className="font-bold text-success text-sm">SÍ es válido</h3>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {["Presupuestos", "Contratos servicios", "NDAs", "LOPD/RGPD", "Encargos", "Albaranes"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* NO sirve */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20">
                      <X className="h-4 w-4 text-destructive" />
                    </div>
                    <h3 className="font-bold text-destructive text-sm">NO es válido</h3>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {[
                      { t: "Hipotecas", r: "Notario" },
                      { t: "Compraventa inmuebles", r: "Escritura" },
                      { t: "Testamentos", r: "Notario" },
                      { t: "Poderes notariales", r: "Notario" }
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>{item.t} <span className="text-xs text-muted-foreground">({item.r})</span></span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Evidencias */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-primary text-sm">Evidencias legales</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">SHA-256</p>
                        <p className="text-xs text-muted-foreground">Integridad documento</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-success shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Timestamp TSA</p>
                        <p className="text-xs text-muted-foreground">Tiempo certificado</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">IP + Dispositivo</p>
                        <p className="text-xs text-muted-foreground">Identidad firmante</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution - Side by side compact */}
      <section className="py-10 lg:py-14 bg-muted/30" id="como-funciona">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-center mb-8 sm:text-3xl">
              Del caos a la claridad
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Before - Compact */}
              <Card className="border-destructive/30 bg-destructive/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
                  ANTES
                </div>
                <CardContent className="p-5 pt-8">
                  <h3 className="font-bold text-destructive flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    El caos de siempre
                  </h3>
                  <div className="space-y-2 text-sm">
                    {["Envías el contrato por email", "El cliente lo imprime", "Lo firma a mano", "Lo escanea (si tiene escáner)", "Te lo reenvía por email"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-destructive/20 text-center text-sm text-muted-foreground">
                    Sin contar "se me olvidó" o "no tengo escáner"
                  </div>
                </CardContent>
              </Card>

              {/* After - Compact */}
              <Card className="border-success/30 bg-success/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-success text-success-foreground text-xs font-bold px-3 py-1 rounded-br-lg">
                  CON MULTICENTROS
                </div>
                <CardContent className="p-5 pt-8">
                  <h3 className="font-bold text-success flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4" />
                    Así de simple
                  </h3>
                  <div className="space-y-2 text-sm">
                    {["Subes tu PDF o lo creas con IA", "El cliente recibe un enlace en su móvil", "Firma con el dedo en la pantalla", "Ambos recibís el certificado firmado"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-success/20 text-center text-sm text-muted-foreground">
                    Sin excusas, sin papel, sin complicaciones
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Security - Compact horizontal */}
      <section className="py-10 lg:py-14 bg-gradient-to-r from-success/5 to-success/10">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-5 gap-6 items-center">
              {/* Content - 3 cols */}
              <div className="md:col-span-3">
                <div className="inline-flex items-center rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-success mb-3">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Nueva funcionalidad
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Más seguridad que un garabato
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Validamos la identidad con un <strong>código único a su WhatsApp</strong>.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {["Verificación 2 pasos", "Acceso a teléfono", "Evidencia extra", "Opcional"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini WhatsApp mockup - 2 cols */}
              <div className="md:col-span-2 flex justify-center">
                <div className="w-44 rounded-2xl border-4 border-slate-800 bg-slate-800 shadow-xl overflow-hidden">
                  <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-white/20" />
                    <p className="text-white font-medium text-xs">Multicentros</p>
                  </div>
                  <div className="bg-[#e5ddd5] p-3">
                    <div className="bg-white rounded-lg p-2 shadow-sm text-center">
                      <p className="text-xs">🔐 Tu código:</p>
                      <p className="text-lg font-bold tracking-widest text-primary">847291</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Horizontal compact cards */}
      <section className="py-10 lg:py-14 bg-background" id="precios">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-warning mb-3">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Sin suscripciones • Créditos NO caducan
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Precios transparentes
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Pack Prueba */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-bold">Pack Prueba</h3>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">0€</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Para probar</p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /><strong>2 envíos</strong> gratis</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Todas las funciones</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Certificado evidencias</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline" size="sm" asChild>
                    <Link to="/register">Empezar gratis</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Básico - Highlighted */}
              <Card className="border-primary shadow-lg relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">
                  POPULAR
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold">Pack Básico</h3>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">12€</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Para autónomos</p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /><strong>10 envíos</strong> (1,20€/u)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />WhatsApp verification</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Asistente Clara AI</li>
                  </ul>
                  <Button className="w-full mt-4" size="sm" asChild>
                    <Link to="/register">Comprar ahora</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Profesional */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-bold">Pack Profesional</h3>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">29€</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Para PYMES</p>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /><strong>30 envíos</strong> (0,97€/u)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Todo del Básico</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Recordatorios auto</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline" size="sm" asChild>
                    <Link to="/register">Comprar ahora</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              IVA incluido. Los créditos no caducan nunca.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA - Compact */}
      <section className="py-10 lg:py-12 bg-primary text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            ¿Listo para cerrar acuerdos más rápido?
          </h2>
          <p className="mt-2 text-primary-foreground/80 max-w-lg mx-auto">
            Cierra acuerdos en 1 minuto con la garantía de tu partner de confianza.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="mt-6 h-11 px-6" 
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
      <footer className="py-8 bg-slate-900 text-slate-400">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                  <span className="text-sm font-bold text-primary">M</span>
                </div>
                <span className="font-semibold text-white">Multicentros</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-sm">Firma Digital</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <LegalModal
                trigger={<button className="hover:text-white transition-colors">Términos</button>}
                title="Términos y Condiciones"
                type="terms"
              />
              <LegalModal
                trigger={<button className="hover:text-white transition-colors">Privacidad</button>}
                title="Política de Privacidad"
                type="privacy"
              />
              <span className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" /> eIDAS
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs space-y-1">
            <p>Ecosistema <strong className="text-white">Multicentros</strong> • Desarrollado por <strong>Operia</strong></p>
            <p>&copy; 2024 Multicentros Comercial. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
