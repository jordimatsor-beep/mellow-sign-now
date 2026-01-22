import { Link } from "react-router-dom";
import { LegalModal } from "@/components/LegalModals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, 
  Check, 
  Shield, 
  FileText, 
  Smartphone, 
  Clock, 
  Hash, 
  MapPin,
  X,
  MessageCircle,
  Zap,
  BadgeCheck,
  CreditCard,
  AlertTriangle,
  Scale
} from "lucide-react";

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            <span className="text-xl font-bold tracking-tight">FirmaClara</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link to="/register">
                Empezar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - La Promesa */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.1),transparent_50%)]" />
        <div className="container relative px-4">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <BadgeCheck className="mr-2 h-4 w-4" />
              Validez legal certificada eIDAS
            </div>

            {/* Main headline */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Deja de perseguir firmas.{" "}
              <span className="text-primary">Cierra acuerdos en 1 minuto.</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Envía presupuestos y contratos al móvil de tu cliente. 
              Sin descargas. Sin impresoras. Validez legal certificada eIDAS.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
                <Link to="/register">
                  Empezar Gratis (2 envíos)
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <a href="#como-funciona">Ver cómo funciona</a>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> Créditos que no caducan
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> Soporte en español
              </span>
            </div>

            {/* Mobile mockup */}
            <div className="mt-16 relative">
              <div className="mx-auto max-w-xs sm:max-w-sm">
                <div className="relative rounded-[2.5rem] border-8 border-slate-800 bg-slate-800 shadow-2xl">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-20 bg-slate-800 rounded-b-xl" />
                  <div className="aspect-[9/19] rounded-[2rem] bg-white overflow-hidden">
                    <div className="h-full flex flex-col">
                      {/* Mock app header */}
                      <div className="bg-primary px-4 py-3 text-white text-center">
                        <p className="text-xs font-medium">Firma tu contrato</p>
                      </div>
                      {/* Mock content */}
                      <div className="flex-1 p-4 space-y-3">
                        <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                        <div className="mt-4 border-2 border-dashed border-slate-300 rounded-lg h-20 flex items-center justify-center">
                          <p className="text-xs text-slate-400">Tu firma aquí</p>
                        </div>
                      </div>
                      {/* Mock button */}
                      <div className="p-4">
                        <div className="bg-primary text-white text-center py-3 rounded-lg text-sm font-medium">
                          Firmar con el dedo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección "La Verdad Clara" - Semáforo Legal */}
      <section className="py-16 lg:py-24 bg-slate-50" id="legalidad">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                La Verdad Clara sobre la{" "}
                <span className="text-primary">Firma Electrónica</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Transparencia total. Sabemos exactamente para qué sirve y para qué no.
                <br />
                <span className="text-sm">Basado en el Reglamento eIDAS (Art. 25) de la UE</span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* SÍ sirve para */}
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-5 w-5 text-green-700" />
                    </div>
                    <h3 className="text-lg font-bold text-green-800">SÍ es válido para:</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Presupuestos y ofertas comerciales",
                      "Contratos de servicios profesionales",
                      "Acuerdos de confidencialidad (NDA)",
                      "Consentimientos LOPD/RGPD",
                      "Encargos de trabajo",
                      "Albaranes y conformidades",
                      "Contratos de colaboración",
                      "Autorizaciones y permisos"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-green-800">
                        <Check className="h-5 w-5 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* NO sirve para */}
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <X className="h-5 w-5 text-red-700" />
                    </div>
                    <h3 className="text-lg font-bold text-red-800">NO es válido para:</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { text: "Hipotecas y préstamos bancarios", reason: "Requiere notario" },
                      { text: "Compraventa de inmuebles", reason: "Requiere escritura pública" },
                      { text: "Testamentos y herencias", reason: "Requiere notario" },
                      { text: "Poderes notariales", reason: "Requiere firma ante notario" },
                      { text: "Documentos judiciales", reason: "Requiere firma cualificada" }
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-red-800">
                        <X className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <span>{item.text}</span>
                          <p className="text-xs text-red-600 mt-0.5">{item.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Evidencias de seguridad */}
            <div className="mt-10 p-6 bg-white rounded-xl border shadow-sm">
              <h3 className="text-center font-semibold mb-6">
                Cada firma genera un certificado de evidencias legales:
              </h3>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-3">
                    <Hash className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold">Integridad (Hash)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Huella digital SHA-256 que garantiza que el documento no ha sido modificado
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-600 mb-3">
                    <Clock className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold">Timestamp (Tiempo)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sello de tiempo certificado por una TSA (Time Stamp Authority)
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-600 mb-3">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold">IP y Dispositivo</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Registro de la dirección IP y navegador del firmante
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* El Problema vs La Solución */}
      <section className="py-16 lg:py-24" id="como-funciona">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Del caos a la claridad
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* El Caos - Before */}
              <div className="relative">
                <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ANTES
                </div>
                <Card className="border-red-200 bg-red-50/30 h-full">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      El caos de siempre
                    </h3>
                    <div className="space-y-4">
                      {[
                        { step: "1", text: "Envías el contrato por email", time: "2 min" },
                        { step: "2", text: "El cliente lo imprime", time: "5 min" },
                        { step: "3", text: "Lo firma a mano", time: "1 min" },
                        { step: "4", text: "Lo escanea (si tiene escáner)", time: "10 min" },
                        { step: "5", text: "Te lo envía de vuelta", time: "5 min" },
                        { step: "6", text: "Tú lo archivas... en algún sitio", time: "?" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-800 text-sm font-bold">
                            {item.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-red-800">{item.text}</p>
                          </div>
                          <span className="text-xs text-red-600">{item.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-red-200">
                      <p className="text-center text-red-800 font-semibold">
                        Total: 23+ minutos (si todo va bien)
                      </p>
                      <p className="text-center text-sm text-red-600 mt-1">
                        Sin contar "se me olvidó" o "no tengo escáner"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FirmaClara - After */}
              <div className="relative">
                <div className="absolute -top-3 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  CON FIRMACLARA
                </div>
                <Card className="border-green-200 bg-green-50/30 h-full">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Así de simple
                    </h3>
                    <div className="space-y-4">
                      {[
                        { step: "1", text: "Subes tu PDF o lo creas con IA", time: "30 seg" },
                        { step: "2", text: "El cliente recibe un enlace en su móvil", time: "Inmediato" },
                        { step: "3", text: "Firma con el dedo en la pantalla", time: "15 seg" },
                        { step: "4", text: "Ambos recibís el certificado firmado", time: "Inmediato" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200 text-green-800 text-sm font-bold">
                            {item.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-green-800">{item.text}</p>
                          </div>
                          <span className="text-xs text-green-600 font-medium">{item.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-green-200">
                      <p className="text-center text-green-800 font-semibold">
                        Total: Menos de 1 minuto
                      </p>
                      <p className="text-center text-sm text-green-600 mt-1">
                        Sin excusas, sin papel, sin complicaciones
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seguridad WhatsApp */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-800 mb-4">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Nueva funcionalidad
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Más seguridad que un garabato
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Validamos la identidad de tu cliente enviando un{" "}
                  <strong>código único a su WhatsApp</strong>.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Verificación en dos pasos automática",
                    "El cliente necesita acceso a su teléfono",
                    "Evidencia adicional de identidad",
                    "Opcional: actívalo solo cuando lo necesites"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                {/* WhatsApp mockup */}
                <div className="mx-auto max-w-[280px]">
                  <div className="rounded-[2rem] border-8 border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
                    <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20" />
                      <div>
                        <p className="text-white font-medium text-sm">FirmaClara</p>
                        <p className="text-white/70 text-xs">Verificación</p>
                      </div>
                    </div>
                    <div className="bg-[#e5ddd5] p-4 min-h-[200px]">
                      <div className="bg-white rounded-lg p-3 shadow-sm max-w-[200px] ml-auto">
                        <p className="text-sm">
                          🔐 Tu código de verificación para firmar el documento es:
                        </p>
                        <p className="text-2xl font-bold text-center mt-2 tracking-widest text-primary">
                          847291
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Válido por 10 minutos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Precios Transparentes */}
      <section className="py-16 lg:py-24" id="precios">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800 mb-4">
                <CreditCard className="mr-2 h-4 w-4" />
                Sin suscripciones • Los créditos NO caducan
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Precios transparentes
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Paga solo por lo que uses. Sin cuotas mensuales, sin compromisos.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {/* Pack Prueba */}
              <Card className="relative">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg">Pack Prueba</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">0€</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Para probar la plataforma
                  </p>
                  <ul className="mt-6 space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <strong>2 envíos</strong> gratis
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Todas las funcionalidades
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Certificado de evidencias
                    </li>
                  </ul>
                  <Button className="w-full mt-6" variant="outline" asChild>
                    <Link to="/register">Empezar gratis</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Básico */}
              <Card className="relative border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  MÁS POPULAR
                </div>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg">Pack Básico</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">12€</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Para autónomos
                  </p>
                  <ul className="mt-6 space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <strong>10 envíos</strong> (1,20€/envío)
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Verificación WhatsApp
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Asistente Clara AI
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Soporte por email
                    </li>
                  </ul>
                  <Button className="w-full mt-6" asChild>
                    <Link to="/register">Comprar ahora</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Pack Profesional */}
              <Card className="relative">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg">Pack Profesional</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">29€</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Para pequeñas empresas
                  </p>
                  <ul className="mt-6 space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <strong>30 envíos</strong> (0,97€/envío)
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Todo del Pack Básico
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Recordatorios automáticos
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      Soporte prioritario
                    </li>
                  </ul>
                  <Button className="w-full mt-6" variant="outline" asChild>
                    <Link to="/register">Comprar ahora</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              IVA incluido. Los créditos no caducan nunca. Puedes comprar más en cualquier momento.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-20 bg-primary text-primary-foreground">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            ¿Listo para cerrar acuerdos más rápido?
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Empieza hoy con 2 envíos gratis. Sin tarjeta, sin compromiso.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="mt-8 h-12 px-8 text-base font-semibold" 
            asChild
          >
            <Link to="/register">
              Crear mi cuenta gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-900 text-slate-400">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <span className="text-lg font-bold text-primary">F</span>
              </div>
              <span className="text-lg font-semibold text-white">FirmaClara</span>
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
              <LegalModal
                trigger={<button className="hover:text-white transition-colors">Contacto</button>}
                title="Contacto"
                type="contact"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4" />
              Cumple con eIDAS
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm">
            <p>&copy; 2024 FirmaClara. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}