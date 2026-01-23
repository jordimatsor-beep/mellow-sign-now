import { Link } from "react-router-dom";
import { MulticentrosLogo } from "@/components/brand/BrandHeader";

export function Footer() {
    return (
        <footer className="bg-slate-950 py-12 text-slate-200">
            <div className="container mx-auto px-4">
                <div className="grid gap-8 md:grid-cols-4">

                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            {/* Using text logo for footer legibility if needed, or component */}
                            <span className="text-2xl font-bold text-white">FirmaClara</span>
                        </div>
                        <p className="text-sm text-slate-400">
                            La solución de firma digital simple, legal y segura para tu negocio.
                        </p>
                        <p className="mt-4 text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} FirmaClara.
                        </p>
                    </div>

                    <div className="md:col-span-1"></div>

                    {/* Producto */}
                    <div className="col-span-1">
                        <h4 className="mb-4 font-bold text-white">Producto</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/how-it-works" className="hover:text-blue-400">Cómo funciona</Link></li>
                            <li><Link to="/credits/purchase" className="hover:text-blue-400">Precios</Link></li>
                            <li><Link to="/legal" className="hover:text-blue-400">Legalidad</Link></li>
                            <li><Link to="/help" className="hover:text-blue-400">Ayuda</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h4 className="mb-4 font-bold text-white">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/terms" className="hover:text-blue-400">Términos de uso</Link></li>
                            <li><Link to="/privacy" className="hover:text-blue-400">Privacidad</Link></li>
                            <li><Link to="/legal" className="hover:text-blue-400">⚖️ Cumple eIDAS</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
