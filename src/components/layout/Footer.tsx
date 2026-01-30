import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { SolutionsModal } from "@/components/SolutionsModal";
import { LegalModal } from "@/components/LegalModals";
import { Shield, Lock, Award, CheckCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[hsl(222,47%,11%)] py-12 text-slate-300">
      <div className="container mx-auto px-4">
        {/* Certification Badges Section */}
        <div className="mb-10 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
              <Award className="h-5 w-5 text-green-400" />
              Plataforma Certificada y Legalmente Válida
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              FirmaClara cumple con los más altos estándares europeos de firma electrónica
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <span className="font-semibold text-white text-sm">eIDAS</span>
              <span className="text-xs text-slate-400">Reglamento UE 910/2014</span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                <Lock className="h-5 w-5 text-green-400" />
              </div>
              <span className="font-semibold text-white text-sm">SSL/TLS</span>
              <span className="text-xs text-slate-400">Cifrado de extremo a extremo</span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-purple-400" />
              </div>
              <span className="font-semibold text-white text-sm">RGPD</span>
              <span className="text-xs text-slate-400">Protección de datos</span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                <Award className="h-5 w-5 text-amber-400" />
              </div>
              <span className="font-semibold text-white text-sm">TSA</span>
              <span className="text-xs text-slate-400">Sellado de tiempo</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            Firma electrónica avanzada con validez legal en toda la Unión Europea · Art. 25 eIDAS
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <Logo className="h-12 w-auto brightness-0 invert opacity-80" />
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              La solución de firma digital simple, legal y segura
              para profesionales y empresas.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Certificado para uso legal en España y la UE</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/how-it-works" className="text-slate-400 hover:text-white transition-colors">Cómo funciona</Link></li>
              <li><a href="/#pricing" className="text-slate-400 hover:text-white transition-colors">Precios</a></li>
              <li><a href="/#clara" className="text-slate-400 hover:text-white transition-colors">Clara IA</a></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Soluciones</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <SolutionsModal
                  type="freelance"
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline">Autónomos</button>}
                />
              </li>
              <li>
                <SolutionsModal
                  type="sme"
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline">Pymes</button>}
                />
              </li>
              <li>
                <SolutionsModal
                  type="retail"
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline">Comercios</button>}
                />
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Legal y Cumplimiento</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <LegalModal
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline">Términos de uso</button>}
                  title="Términos y Condiciones"
                  type="terms"
                />
              </li>
              <li>
                <LegalModal
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline">Privacidad (RGPD)</button>}
                  title="Política de Privacidad"
                  type="privacy"
                />
              </li>
              <li>
                <LegalModal
                  trigger={<button className="text-slate-400 hover:text-white transition-colors text-left hover:underline flex items-center gap-1"><Shield className="h-3 w-3 text-green-400" />Cumplimiento eIDAS</button>}
                  title="Cumplimiento eIDAS"
                  type="legal"
                />
              </li>
              <li>
                <Link to="/legal" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  <Award className="h-3 w-3 text-green-400" />
                  Validez Legal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} FirmaClara. Tecnología operada por Operia.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Servicio de firma electrónica avanzada conforme al Reglamento (UE) 910/2014
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <Lock className="h-3 w-3" />
              SSL/TLS
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-blue-400 font-medium">
              <Shield className="h-3 w-3" />
              eIDAS
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-purple-400 font-medium">
              <CheckCircle className="h-3 w-3" />
              RGPD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
