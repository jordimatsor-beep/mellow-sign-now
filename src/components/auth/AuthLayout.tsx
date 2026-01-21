import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    mode?: 'login' | 'register';
}

export function AuthLayout({ children, title, subtitle, mode = 'login' }: AuthLayoutProps) {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen w-full bg-white overflow-hidden font-sans">
            {/* Left Panel - Form */}
            <div className="flex w-full flex-col justify-center px-4 sm:px-6 lg:w-1/2 lg:px-20 xl:px-24 relative z-10">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="mb-10">
                        <img
                            src="https://storage.googleapis.com/msgsndr/tdZAorlZ97ZS4xrRVntK/media/6970195cd4fb900ce1a6403e.png"
                            alt="FirmaClara"
                            className="h-24 w-auto mb-6"
                        />
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
                        {subtitle && (
                            <p className="mt-2 text-sm text-slate-600">
                                {subtitle}
                            </p>
                        )}

                        {/* Visual reinforcement for Register */}
                        {mode === 'register' && (
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                <Sparkles className="h-3 w-3" />
                                Regalo de bienvenida incluido
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        {children}
                    </div>
                </div>
            </div>

            {/* Right Panel - Info & Visuals */}
            <div className="hidden lg:relative lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:items-center lg:bg-blue-600 text-white overflow-hidden">

                {/* Background Texture: Dot Pattern */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                </div>

                {/* Big Typography as Texture */}
                <div className="absolute top-10 right-10 text-9xl font-black text-white opacity-5 select-none pointer-events-none transform rotate-12">
                    LEGAL
                </div>
                <div className="absolute bottom-10 left-10 text-9xl font-black text-white opacity-5 select-none pointer-events-none transform -rotate-6">
                    FIRMA
                </div>

                {/* Separator - Custom Shape (More organic/textured edge) */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-24 bg-white z-20"
                    style={{
                        clipPath: "polygon(0 0, 100% 0, 85% 15%, 100% 30%, 80% 45%, 100% 60%, 85% 75%, 100% 90%, 80% 100%, 0 100%)"
                    }}
                />
                {/* Layered wave for depth */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-32 bg-blue-500/30 z-10"
                    style={{
                        clipPath: "polygon(0 0, 100% 0, 90% 20%, 100% 40%, 85% 60%, 100% 80%, 90% 100%, 0 100%)"
                    }}
                />


                <div className="relative z-30 space-y-10 max-w-lg px-12">

                    {mode === 'register' ? (
                        // REGISTER CONTENT
                        <>
                            <div>
                                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-400 text-white shadow-lg ring-4 ring-green-400/30">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <h3 className="text-4xl font-bold leading-tight">
                                    Empieza con <br />
                                    <span className="text-green-300">2 Créditos Gratis</span>
                                </h3>
                                <p className="mt-4 text-lg text-blue-100/90 font-light leading-relaxed">
                                    Únete a miles de autónomos que ya firman digitalmente. Sin tarjetas de crédito para probar.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-blue-50">
                                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                                    <span>Firma desde el móvil o PC</span>
                                </div>
                                <div className="flex items-center gap-3 text-blue-50">
                                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                                    <span>Contratos blindados legalmente</span>
                                </div>
                                <div className="flex items-center gap-3 text-blue-50">
                                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                                    <span>Historial de auditoría completo</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        // LOGIN CONTENT
                        <>
                            <div>
                                <h3 className="text-3xl font-bold leading-tight">
                                    Tu oficina legal, <br />
                                    <span className="text-blue-200">simplificada.</span>
                                </h3>
                                <p className="mt-6 text-lg text-blue-100 font-light">
                                    "La tecnología no debería ser una barrera, sino un puente hacia la tranquilidad legal."
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4">
                                <FeatureRow
                                    icon={<ShieldCheck className="h-6 w-6 text-blue-200" />}
                                    title="Seguridad Bancaria"
                                    desc="Tus documentos están cifrados y protegidos."
                                />
                                <FeatureRow
                                    icon={<Sparkles className="h-6 w-6 text-blue-200" />}
                                    title="Asistencia Inteligente"
                                    desc="Clara está lista para revisar tus borradores."
                                />
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

function FeatureRow({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10">
            <div className="mt-1 shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-white">{title}</h4>
                <p className="text-sm text-blue-100 leading-relaxed opacity-80">{desc}</p>
            </div>
        </div>
    )
}
