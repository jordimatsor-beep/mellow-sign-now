import { Link } from "react-router-dom";
import { MulticentroLogo } from "@/components/brand/BrandHeader";

export function Footer() {
  return (
    <footer className="bg-[hsl(222,47%,11%)] py-12 text-slate-300">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <MulticentroLogo className="h-10 [&_*]:!text-slate-300 [&_path]:!stroke-slate-400 [&_circle]:!fill-slate-400" />
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              La solución de firma digital simple, legal y segura
              para profesionales y empresas.
            </p>
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
              <li><span className="text-slate-400">Autónomos</span></li>
              <li><span className="text-slate-400">Pymes</span></li>
              <li><span className="text-slate-400">Comercios</span></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Términos de uso</Link></li>
              <li><Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacidad</Link></li>
              <li><Link to="/legal" className="text-slate-400 hover:text-white transition-colors">Cumplimiento eIDAS</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Un servicio del ecosistema Multicentro. Tecnología operada por Operia.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>SSL/TLS</span>
            <span>·</span>
            <span>RGPD</span>
            <span>·</span>
            <span>eIDAS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
