import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LegalModal } from "@/components/LegalModals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Lock,
  Scale,
  Globe,
  Cloud,
  Briefcase,
  Wrench,
  FileSignature,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SolutionsModal } from "@/components/SolutionsModal";
import { ContactSalesDialog } from "@/components/ContactSalesDialog";

export default function Index() {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect to dashboard if logged in
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Professional Header - Sticky White */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          {/* Logo - Left - Larger and properly spaced */}
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-auto" />
          </div>

          {/* Navigation - Center (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/how-it-works" className="text-base font-semibold text-foreground/80 hover:text-primary transition-colors">
              Cómo funciona
            </Link>
            <a href="#pricing" className="text-base font-semibold text-foreground/80 hover:text-primary transition-colors">
              Precios
            </a>
            <Link to="/legal" className="text-base font-semibold text-foreground/80 hover:text-primary transition-colors">
              Legalidad
            </Link>
            <Link to="/help" className="text-base font-semibold text-foreground/80 hover:text-primary transition-colors">
              Ayuda
            </Link>
          </nav>

          {/* Actions - Right */}
          <div className="flex items-center gap-4">
            {/* Powered by OPERIA - subtle attribution */}
            <span className="hidden lg:inline-flex text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Powered by <span className="font-semibold ml-1">OPERIA</span>
            </span>

            {session ? (
              <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105 active:scale-95">
                <Link to="/dashboard">Ir al Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-300">
                  <Link to="/login">Acceso</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105 active:scale-95">
                  <Link to="/register">Empezar Gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Compact, 2 columns */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Asistente IA incluido
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight animate-fade-in [animation-delay:200ms]">
                Firma electrónica simple para <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">empresas y autónomos</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg">
                Firma contratos, presupuestos y documentos online con validez legal.
                Plataforma de firma digital con cumplimiento eIDAS. Sin instalación. Sin cuotas fijas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-base px-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in [animation-delay:400ms]">
                  <Link to="/register">
                    Empezar Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base border-border hover:bg-secondary/50 transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in [animation-delay:500ms]">
                  <Link to="/how-it-works">Cómo funciona</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Sin tarjeta de crédito · 2 créditos gratis
              </p>
            </div>

            {/* Right - Abstract UI Card (Document Preview) - Animated */}
            <div className="relative hidden lg:block group perspective-1000">
              {/* Animated Border Gradient */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
              <Card className="relative bg-background border border-border shadow-lg rounded-xl overflow-hidden animate-fade-in hover:shadow-2xl transition-all duration-500 ring-1 ring-black/5">
                <CardContent className="p-0">
                  {/* Document Header */}
                  <div className="bg-secondary/50 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Presupuesto_Reforma.pdf</p>
                          <p className="text-sm text-muted-foreground">Enviado hace 2 min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 animate-pulse">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">Firmado</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Activity Notification */}
                  <div className="px-6 py-3 bg-success/5 border-b border-success/10 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <p className="text-xs text-success font-medium">Documento firmado correctamente</p>
                  </div>

                  {/* Document Body */}
                  <div className="p-6 space-y-4">
                    {/* Document preview lines with shimmer */}
                    <div className="space-y-2">
                      <div className="h-3 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded w-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="h-3 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded w-4/5 animate-pulse" style={{ animationDelay: '100ms' }} />
                      <div className="h-3 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted rounded w-3/5 animate-pulse" style={{ animationDelay: '200ms' }} />
                    </div>

                    {/* Signature Area - Enhanced */}
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center gap-4">
                        {/* Signature Box with handwriting effect */}
                        <div className="h-14 w-28 bg-gradient-to-br from-primary/5 to-muted rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center relative overflow-hidden">
                          <svg viewBox="0 0 100 40" className="w-20 h-8 text-primary/60">
                            <path
                              d="M5 30 Q20 10, 35 25 T65 20 Q80 15, 95 25"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="animate-[draw_2s_ease-out_forwards]"
                              style={{
                                strokeDasharray: 150,
                                strokeDashoffset: 0
                              }}
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">María García</p>
                          <p className="text-xs text-muted-foreground">Cliente · DNI: ***4821G</p>
                          <p className="text-xs text-success mt-1 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Verificado por email
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp Footer */}
                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>ID: DOC-2026-00847</span>
                      <span>23/01/2026, 14:32 CET</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar - Technical Infrastructure */}
      <section className="bg-secondary py-8 border-y border-border">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">Cumplimiento normativo y seguridad técnica: <span className="text-foreground">eIDAS • RGPD • SSL/TLS • Auditoría de Evidencias</span></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Encriptación SSL/TLS</p>
                <p className="text-xs text-muted-foreground">Seguridad Bancaria</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Cumplimiento RGPD</p>
                <p className="text-xs text-muted-foreground">Protección de Datos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                <Scale className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Normativa eIDAS</p>
                <p className="text-xs text-muted-foreground">Validez UE</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                <Cloud className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Infraestructura Cloud</p>
                <p className="text-xs text-muted-foreground">Alta Disponibilidad</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Grid - "Swiss Army Knife" */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Una herramienta para todo tu negocio
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desde el equipo comercial hasta el departamento legal,
              todos tus documentos firmados en un solo lugar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Commercial */}
            <Card className="bg-background border border-border hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Briefcase className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Comercial</h3>
                <p className="text-muted-foreground">
                  Cierra presupuestos y propuestas en el acto.
                  Envía, firma y cobra sin perder tiempo.
                </p>
              </CardContent>
            </Card>

            {/* Operations */}
            <Card className="bg-background border border-border hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Wrench className="h-6 w-6 text-success" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Operaciones</h3>
                <p className="text-muted-foreground">
                  Partes de trabajo y albaranes firmados in situ.
                  Documenta entregas al instante.
                </p>
              </CardContent>
            </Card>

            {/* Legal */}
            <Card className="bg-background border border-border hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <FileSignature className="h-6 w-6 text-chart-4" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Legal</h3>
                <p className="text-muted-foreground">
                  Contratos comerciales y acuerdos con plena validez.
                  Cumplimiento eIDAS garantizado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Clara AI Section */}
      <section id="clara" className="py-16 lg:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Inteligencia Artificial
              </div>

              <h2 className="text-3xl font-bold text-foreground">
                Crea documentos con Clara IA
              </h2>

              <p className="text-muted-foreground">
                Describe lo que necesitas y Clara redactará presupuestos, NDAs,
                contratos de servicio y más. Solo revisa, ajusta y envía a firmar.
              </p>

              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-foreground">Presupuestos y propuestas comerciales</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-foreground">Contratos de confidencialidad (NDA)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-foreground">Acuerdos de servicios profesionales</span>
                </li>
              </ul>

              <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
                <Link to="/register">
                  Probar Clara IA
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Right - Abstract UI Card */}
            <Card className="bg-background border border-border shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Clara IA</p>
                    <p className="text-sm text-muted-foreground">Asistente Inteligente</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      "Necesito un presupuesto para una reforma de baño,
                      materiales incluidos, plazo 2 semanas..."
                    </p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
                    <p className="text-sm text-foreground">
                      He creado tu presupuesto con todos los detalles.
                      ¿Quieres que añada condiciones de pago?
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works - Simplified */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Tres pasos y listo
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Sube o crea</h3>
              <p className="text-sm text-muted-foreground">
                Sube tu PDF o créalo con Clara IA
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Envía</h3>
              <p className="text-sm text-muted-foreground">
                El destinatario recibe un enlace seguro
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Firmado</h3>
              <p className="text-sm text-muted-foreground">
                Documento con validez legal inmediata
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Precios transparentes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Paga solo por lo que usas. Sin cuotas mensuales fijas.
              Los créditos no caducan nunca.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Pack */}
            <Card className="bg-background border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <CardContent className="p-8">
                <h3 className="font-semibold text-lg text-foreground mb-2">Pack Básico</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">15€</span>
                  <span className="text-muted-foreground">/ pack</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>10 documentos (1.50€ / doc)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Créditos sin caducidad</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Certificado de evidencias</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/register">Empezar ahora</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Pack - Highlighted */}
            <Card className="bg-background border-2 border-primary shadow-xl scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                MÁS POPULAR
              </div>
              <CardContent className="p-8">
                <h3 className="font-semibold text-lg text-foreground mb-2">Pack Profesional</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">60€</span>
                  <span className="text-muted-foreground">/ pack</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>50 documentos (1.20€ / doc)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Ahorras un 20%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Soporte prioritario</span>
                  </li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary/90" size="lg" asChild>
                  <Link to="/register">Comprar Pack</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Business Pack */}
            <Card className="bg-background border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <CardContent className="p-8">
                <h3 className="font-semibold text-lg text-foreground mb-2">Pack Empresa</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">100€</span>
                  <span className="text-muted-foreground">/ pack</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>100 documentos (1.00€ / doc)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Ahorras un 33%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>API disponible (beta)</span>
                  </li>
                </ul>
                <ContactSalesDialog
                  trigger={
                    <Button className="w-full">
                      Contactar Ventas
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section - SEO */}
      <section className="py-16 lg:py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Preguntas frecuentes sobre firma electrónica</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Resolvemos las dudas más habituales sobre firmar documentos online con validez legal en España.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "¿Es legal la firma electrónica en España?",
                a: "Sí. Según el Reglamento eIDAS (UE Nº 910/2014) y la Ley 6/2020 en España, la firma electrónica tiene plena validez legal. No se pueden denegar efectos jurídicos a una firma por el mero hecho de ser electrónica."
              },
              {
                q: "¿Qué diferencia hay entre firma electrónica y firma digital?",
                a: "La firma electrónica es el concepto legal amplio que abarca cualquier método de identificación electrónica. La firma digital es un tipo específico que usa criptografía. FirmaClara ofrece firma electrónica simple con validez legal bajo eIDAS."
              },
              {
                q: "¿Cuánto cuesta firmar documentos online con FirmaClara?",
                a: "FirmaClara ofrece 2 créditos gratis para probar. Los packs empiezan desde 15€ por 10 documentos (1,50€/documento). Sin cuotas mensuales ni compromisos. Los créditos no caducan nunca."
              },
              {
                q: "¿FirmaClara cumple con el RGPD y eIDAS?",
                a: "Sí. FirmaClara cumple con el Reglamento General de Protección de Datos (RGPD) y opera bajo el marco eIDAS para firma electrónica simple. Los documentos se almacenan con encriptación SSL/TLS y generamos un certificado de auditoría completo."
              },
              {
                q: "¿Puedo firmar presupuestos y contratos desde el móvil?",
                a: "Sí. FirmaClara funciona desde cualquier dispositivo (móvil, tablet o PC) sin necesidad de instalar ninguna aplicación. El firmante recibe un enlace seguro y firma con un clic o dibujando su rúbrica."
              }
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-border bg-background p-5 transition-shadow hover:shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground">
                  {faq.q}
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-background mb-4">
            Empieza a firmar documentos online hoy
          </h2>
          <p className="text-background/70 mb-8 max-w-xl mx-auto">
            Prueba nuestra plataforma de firma electrónica gratis. Sin compromisos. Sin tarjeta de crédito. 2 créditos gratis.
          </p>
          <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90 shadow-xl shadow-black/10 hover:shadow-black/20 transition-all duration-300 hover:scale-105 active:scale-95">
            <Link to="/register">
              Crear Cuenta Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Professional Footer - Dark Slate */}
      <footer className="bg-foreground py-12 text-background/70">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-5">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-background/10 rounded-lg p-2">
                    <Logo className="h-10 w-auto brightness-0 invert opacity-90" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-background/50 max-w-xs">
                Plataforma de firma electrónica y firma digital con validez legal en España.
                Solución segura para autónomos, pymes y empresas.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/how-it-works" className="text-background/50 hover:text-background transition-colors">Cómo funciona</Link></li>
                <li><Link to="/register" className="text-background/50 hover:text-background transition-colors">Precios</Link></li>
                <li><Link to="/register" className="text-background/50 hover:text-background transition-colors">Clara IA</Link></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Soluciones</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <SolutionsModal
                    type="freelance"
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left hover:underline">Autónomos</button>}
                  />
                </li>
                <li>
                  <SolutionsModal
                    type="sme"
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left hover:underline">Pymes</button>}
                  />
                </li>
                <li>
                  <SolutionsModal
                    type="retail"
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left hover:underline">Comercios</button>}
                  />
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <LegalModal
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left">Términos de uso</button>}
                    title="Términos y Condiciones"
                    type="terms"
                  />
                </li>
                <li>
                  <LegalModal
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left">Privacidad</button>}
                    title="Política de Privacidad"
                    type="privacy"
                  />
                </li>
                <li>
                  <LegalModal
                    trigger={<button className="text-background/50 hover:text-background transition-colors text-left">Cumplimiento eIDAS</button>}
                    title="Cumplimiento eIDAS"
                    type="legal"
                  />
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-background/40">
              &copy; {new Date().getFullYear()} FirmaClara. Tecnología operada por Operia.
            </p>
            <div className="flex items-center gap-4 text-xs text-background/40">
              <span>SSL/TLS</span>
              <span>·</span>
              <span>RGPD</span>
              <span>·</span>
              <span>eIDAS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}