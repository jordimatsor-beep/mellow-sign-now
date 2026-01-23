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
  Sparkles
} from "lucide-react";
import { MulticentroLogo } from "@/components/brand/BrandHeader";

export default function Index() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header - Sticky White */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          {/* Logo - Left - Larger and properly spaced */}
          <div className="flex items-center gap-3">
            <MulticentroLogo className="h-9" />
            <span className="text-sm font-medium text-foreground border-l border-border pl-3 hidden sm:inline">Firma Digital</span>
          </div>

          {/* Navigation - Center (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cómo funciona
            </Link>
            <Link to="/credits/purchase" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </Link>
            <Link to="/legal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Legalidad
            </Link>
            <Link to="/help" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Ayuda
            </Link>
          </nav>

          {/* Actions - Right */}
          <div className="flex items-center gap-4">
            {/* Powered by OPERIA - subtle attribution */}
            <span className="hidden lg:inline-flex text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Powered by <span className="font-semibold ml-1">OPERIA</span>
            </span>
            <Button variant="outline" asChild className="border-border text-muted-foreground hover:text-foreground">
              <Link to="/auth/login">Acceso</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/auth/register">Empezar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Compact, 2 columns */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Asistente IA incluido
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Acelera tus ventas y <span className="text-primary">formaliza acuerdos</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                La solución de firma electrónica simple (eIDAS) y gestión documental 
                diseñada para empresas ágiles. Sin instalación. Sin cuotas fijas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-base px-8">
                  <Link to="/auth/register">
                    Empezar Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base border-border">
                  <Link to="/how-it-works">Ver Demostración</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Sin tarjeta de crédito · 3 documentos gratis
              </p>
            </div>

            {/* Right - Abstract UI Card (Document Preview) - Animated */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
              <Card className="relative bg-background border border-border shadow-lg rounded-xl overflow-hidden animate-fade-in">
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
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
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
            <Card className="bg-background border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
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
            <Card className="bg-background border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
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
            <Card className="bg-background border border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4">
                  <FileSignature className="h-6 w-6 text-chart-4" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Legal</h3>
                <p className="text-muted-foreground">
                  Contratos laborales y acuerdos con plena validez. 
                  Cumplimiento eIDAS garantizado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Clara AI Section */}
      <section className="py-16 lg:py-20 bg-secondary">
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
                <Link to="/auth/register">
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

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-background mb-4">
            Empieza a firmar documentos hoy
          </h2>
          <p className="text-background/70 mb-8 max-w-xl mx-auto">
            Sin compromisos. Sin tarjeta de crédito. 3 documentos gratis para probar.
          </p>
          <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90">
            <Link to="/auth/register">
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
                    <MulticentroLogo className="h-8 [&_*]:!text-background/80 [&_path]:!stroke-background/60 [&_circle]:!fill-background/60" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-background/50 max-w-xs">
                La solución de firma digital simple, legal y segura 
                para profesionales y empresas.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/how-it-works" className="text-background/50 hover:text-background transition-colors">Cómo funciona</Link></li>
                <li><Link to="/credits/purchase" className="text-background/50 hover:text-background transition-colors">Precios</Link></li>
                <li><Link to="/clara" className="text-background/50 hover:text-background transition-colors">Clara IA</Link></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Soluciones</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-background/50">Autónomos</span></li>
                <li><span className="text-background/50">Pymes</span></li>
                <li><span className="text-background/50">Comercios</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 font-semibold text-background">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <LegalModal
                    trigger={<button className="text-background/50 hover:text-background transition-colors">Términos de uso</button>}
                    title="Términos y Condiciones"
                    type="terms"
                  />
                </li>
                <li>
                  <LegalModal
                    trigger={<button className="text-background/50 hover:text-background transition-colors">Privacidad</button>}
                    title="Política de Privacidad"
                    type="privacy"
                  />
                </li>
                <li><Link to="/legal" className="text-background/50 hover:text-background transition-colors">Cumplimiento eIDAS</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-background/40">
              &copy; {new Date().getFullYear()} Un servicio del ecosistema Multicentro. Tecnología operada por Operia.
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