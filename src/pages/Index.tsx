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
  PenTool,
  Sparkles
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Banner - ZapSign style */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-sm">
        <span className="opacity-90">Firma electrónica con validez legal</span>
        <span className="mx-2">→</span>
        <Link to="/register" className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity">
          Prueba gratis
        </Link>
      </div>

      {/* Navigation Header - Professional with wider logo area */}
      <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
        <div className="container flex h-20 items-center justify-between px-4 lg:px-8">
          {/* Logo + Service name - More space for logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-4">
              {/* Multicentro logo - accurate SVG based on official design */}
              <svg viewBox="0 0 200 60" className="h-12 w-auto">
                {/* Cart icon */}
                <g transform="translate(0, 5)">
                  {/* Cart body */}
                  <path 
                    d="M8 15 L15 15 L15 38 Q15 45 22 45 L42 45" 
                    stroke="#6B7280" 
                    strokeWidth="5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Cart handle */}
                  <path 
                    d="M8 15 L3 5" 
                    stroke="#6B7280" 
                    strokeWidth="5" 
                    strokeLinecap="round" 
                    fill="none"
                  />
                  {/* Wheels */}
                  <circle cx="25" cy="48" r="4" fill="#6B7280" />
                  <circle cx="38" cy="48" r="4" fill="#6B7280" />
                  {/* Colored dots */}
                  <circle cx="15" cy="6" r="5" fill="#5B3D8A" />
                  <circle cx="26" cy="14" r="5" fill="#B91C1C" />
                  <circle cx="37" cy="14" r="5" fill="#60A5FA" />
                </g>
                {/* Text */}
                <text x="52" y="20" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="300" fill="#6B7280">multi</text>
                <text x="52" y="36" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="400" fill="#60A5FA">centro</text>
                <text x="52" y="52" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#5B3D8A">comercial</text>
              </svg>
              <Separator orientation="vertical" className="h-10 hidden sm:block" />
              <span className="text-base font-bold text-primary hidden sm:block">Firma Digital</span>
            </Link>

            {/* Navigation links - ZapSign style */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
              <a href="#legalidad" className="text-muted-foreground hover:text-foreground transition-colors">Legalidad</a>
              <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
              <a href="#precios" className="text-muted-foreground hover:text-foreground transition-colors">Precios</a>
            </nav>
          </div>

          {/* Right side - Powered by + CTAs */}
          <div className="flex items-center gap-4">
            {/* Powered by Operia - only visible in header */}
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

      {/* Hero Section - Compact 2-column layout */}
      <section className="py-10 lg:py-16 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                <Building2 className="mr-2 h-4 w-4" />
                Servicio exclusivo Multicentro
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                Multicentro te trae la{" "}
                <span className="text-primary">firma digital</span> que estabas esperando.
              </h1>

              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Envía documentos desde tu panel o <strong className="text-primary">créalos con IA Clara</strong>. 
                Un nuevo servicio exclusivo para clientes Multicentro.
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

      {/* Trust Bar - Compact, no Operia */}
      <section className="py-5 bg-muted/30 border-y">
        <div className="container px-4">
          <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> Validez legal eIDAS
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> Certificado de evidencias
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> +10.000 documentos firmados
            </span>
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

      {/* Clara IA Feature - New section */}
      <section className="py-10 lg:py-14 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Content */}
              <div>
                <div className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary mb-3">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Inteligencia Artificial
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Crea documentos con <span className="text-primary">Clara IA</span>
                </h2>
                <p className="mt-3 text-muted-foreground">
                  ¿No tienes un PDF listo? Describe lo que necesitas y Clara, nuestra asistente legal con IA, 
                  generará un documento profesional en segundos.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>Contratos de servicios, NDAs, presupuestos...</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>Personalizado con tus datos y los del cliente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>Revisión y edición antes de enviar</span>
                  </li>
                </ul>
              </div>

              {/* Visual */}
              <div className="flex justify-center">
                <Card className="w-full max-w-sm border-primary/30 shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Clara IA</p>
                        <p className="text-xs text-muted-foreground">Asistente legal</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground italic">"Necesito un presupuesto de servicios de diseño web para un cliente..."</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Clara está generando tu documento...
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                    {["Envías el documento por email", "El cliente lo imprime", "Lo firma a mano", "Lo escanea (si tiene escáner)", "Te lo reenvía por email"].map((item, i) => (
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
                  CON MULTICENTRO
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
                  Seguridad verificada por WhatsApp
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
                    <p className="text-white font-medium text-xs">Multicentro</p>
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
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />Verificación WhatsApp</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><strong>Clara IA</strong> incluida</li>
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

      {/* Footer - Professional ZapSign style */}
      <footer className="py-10 bg-foreground text-background/70">
        <div className="container px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-4">
                {/* Footer logo - simplified version */}
                <svg viewBox="0 0 160 50" className="h-10 w-auto">
                  <g transform="translate(0, 3)">
                    <path 
                      d="M6 12 L12 12 L12 32 Q12 38 18 38 L35 38" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      fill="none"
                      opacity="0.6"
                    />
                    <path d="M6 12 L2 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6"/>
                    <circle cx="20" cy="42" r="3" fill="currentColor" opacity="0.6" />
                    <circle cx="31" cy="42" r="3" fill="currentColor" opacity="0.6" />
                    <circle cx="12" cy="5" r="4" fill="#9F7AEA" />
                    <circle cx="21" cy="11" r="4" fill="#F87171" />
                    <circle cx="30" cy="11" r="4" fill="#60A5FA" />
                  </g>
                  <text x="42" y="16" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="300" fill="currentColor" opacity="0.6">multi</text>
                  <text x="42" y="29" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="400" fill="#60A5FA">centro</text>
                  <text x="42" y="42" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" fill="#9F7AEA">comercial</text>
                </svg>
                <Separator orientation="vertical" className="h-8 bg-background/20" />
                <span className="text-sm font-bold text-background">Firma Digital</span>
              </div>
              <p className="text-sm text-background/60 max-w-xs">
                Servicio de firma electrónica con validez legal del ecosistema Multicentro.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-background mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#legalidad" className="hover:text-background transition-colors">Legalidad</a></li>
                <li><a href="#como-funciona" className="hover:text-background transition-colors">Cómo funciona</a></li>
                <li><a href="#precios" className="hover:text-background transition-colors">Precios</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-background mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <LegalModal
                    trigger={<button className="hover:text-background transition-colors">Términos de uso</button>}
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
                <li className="flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Cumple eIDAS
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p>&copy; 2024 Multicentro Comercial. Todos los derechos reservados.</p>
            <p className="text-background/50">Un servicio del ecosistema Multicentro</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
