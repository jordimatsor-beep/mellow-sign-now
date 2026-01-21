import { Link } from "react-router-dom";
import { LegalModal } from "@/components/LegalModals";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Shield, FileText, Smartphone } from "lucide-react";

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 lg:py-16 text-center space-y-6 bg-slate-50">
        <div className="container max-w-4xl px-4">
          <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2"></span>
            Firma digital simple y legal para todos
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Cierra acuerdos más rápido con <span className="text-primary">FirmaClara</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            La plataforma de firma electrónica diseñada para autónomos y pequeñas empresas. Envía, firma y gestiona tus contratos en segundos.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" className="h-11 px-8 text-base" asChild>
              <Link to="/register">
                Empezar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-8 text-base" asChild>
              <Link to="/login">
                Iniciar sesión
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="container px-4">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">100% Legal y Seguro</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Cumplimos con eIDAS y generamos pruebas de auditoría completas para cada documento firmado.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Asistente Clara AI</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Nuestra IA te ayuda a redactar y revisar contratos para que no pierdas tiempo en temas legales.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                <Smartphone className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Firma en cualquier lugar</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Tus clientes pueden firmar desde su móvil sin descargar ninguna app. Rápido y sencillo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing/Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-center">
        <div className="container px-4">
          <p>&copy; 2024 FirmaClara. Todos los derechos reservados.</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="mt-4 flex justify-center gap-6 text-sm">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
