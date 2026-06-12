import { Plus, FileText, Clock, Check, Loader2, File, AlertCircle, ArrowRight, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useCredits } from "@/hooks/useCredits";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { LOW_CREDITS_THRESHOLD } from "@/lib/constants";
import { PlanUsageCard } from "@/components/plan/PlanUsageCard";
import { OverageBanner } from "@/components/plan/OverageBanner";

interface Document {
  id: string;
  title: string;
  signer_email: string;
  status: DocumentStatus;
  created_at: string;
  sent_at?: string;
  signed_at?: string;
}

// Renders a numeric stat that shows a skeleton placeholder while loading.
// Extracted to avoid repeating the same ternary skeleton in every stat card.
function StatCardValue({ loading, value }: { loading: boolean; value: number }) {
  if (loading) {
    return <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-200" />;
  }
  return <>{value}</>;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";

  // Fetch documents with React Query - cached for 5 minutes
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: queryKeys.documents.dashboard,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, signer_email, status, created_at, sent_at, signed_at')
        .eq('is_template', false) // ME-04: las plantillas no son envíos
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as unknown as Document[]) || [];
    },
    enabled: !!user,
  });

  // Fetch credits with shared hook - cached for 5 minutes
  const { credits, isLoading: loadingCredits } = useCredits();

  // Calculate stats — safe even when data is still loading (defaults to 0/[])
  const stats = {
    pending: documents.filter(d => ['sent', 'viewed'].includes(d.status)).length,
    signed: documents.filter(d => d.status === 'signed').length,
    total: documents.length,
    credits: credits
  };

  // Un documento "enviado" deja de ser draft (sent/viewed/signed/...). Se usa
  // para distinguir cuentas nuevas (banner de bienvenida) de cuentas con uso
  // real (alerta de saldo bajo). Así ambos avisos nunca aparecen a la vez.
  const hasSentDocument = documents.some(d => d.status !== 'draft');

  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('dashboard.greeting')}, {userName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loadingCredits ? <Loader2 className="inline h-3 w-3 animate-spin" /> : <span className="font-semibold text-foreground">{stats.credits}</span>} {t('dashboard.credits_available')}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link to="/documents/new">{t('dashboard.create_document')}</Link>
        </Button>
      </div>

      {/* Banner de bienvenida (QW-01) — solo cuentas nuevas sin envíos */}
      {!loadingCredits && <WelcomeBanner credits={credits} hasSentDocument={hasSentDocument} />}

      {/* Aviso de overage activo (plan Profesional) */}
      <OverageBanner />

      {/* Bloque de uso del plan: cuota mensual, créditos de pack y renovación */}
      <PlanUsageCard />

      {/* Saldo agotado (QW-04) — más prominente; el envío ya queda bloqueado en NewDocument */}
      {!loadingCredits && hasSentDocument && credits === 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">Te has quedado sin créditos</h3>
                <p className="text-sm text-destructive/80">Mejora tu plan o compra un pack para volver a enviar documentos.</p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/precios">Comprar créditos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Saldo bajo (QW-04) — entre 1 y el umbral, solo con uso real previo */}
      {!loadingCredits && hasSentDocument && credits > 0 && credits <= LOW_CREDITS_THRESHOLD && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-amber-900">Te quedan pocos créditos ({credits})</h3>
                <p className="text-sm text-amber-700">Recarga ahora para no interrumpir tus envíos.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:border-amber-300" asChild>
              <Link to="/precios">Comprar pack</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid - Denser */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="border shadow-sm bg-white hover:border-slate-300 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('dashboard.stats.pending')}</p>
              <p className="text-xl font-bold text-slate-900"><StatCardValue loading={loadingDocs} value={stats.pending} /></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white hover:border-slate-300 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 border border-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('dashboard.stats.signed')}</p>
              <p className="text-xl font-bold text-slate-900"><StatCardValue loading={loadingDocs} value={stats.signed} /></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white hover:border-slate-300 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('dashboard.stats.total')}</p>
              <p className="text-xl font-bold text-slate-900"><StatCardValue loading={loadingDocs} value={stats.total} /></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area: Recent Documents */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.recent_documents')}</h2>
            <Link to="/documents" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              {t('dashboard.view_all')}
            </Link>
          </div>

          <div className="space-y-3">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-indigo-500" />
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">Envía tu primer documento</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Tienes <span className="font-semibold text-primary">{stats.credits} crédito{stats.credits !== 1 ? 's' : ''} gratis</span> — úsalos ahora y comprueba lo fácil que es.
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-2.5 mb-5">
                    {[
                      { icon: Upload, color: 'text-blue-600 bg-blue-50', label: 'Sube un PDF' },
                      { icon: Plus,   color: 'text-green-600 bg-green-50', label: 'Introduce el email de tu cliente' },
                      { icon: Check,  color: 'text-purple-600 bg-purple-50', label: 'Tu cliente firma en 1 minuto desde cualquier dispositivo' },
                    ].map(({ icon: Icon, color, label }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm text-slate-600">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button asChild className="flex-1 gap-2">
                      <Link to="/documents/new">
                        <Upload className="h-4 w-4" />
                        Subir mi primer documento
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="group block rounded-lg border border-slate-200 bg-white p-3 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-primary/5 transition-colors">
                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">
                            {doc.signer_email}
                          </p>
                          <span className="text-[10px] text-slate-300">•</span>
                          <p className="text-[10px] text-slate-400">
                            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={doc.status === 'signed' ? 'certified' : doc.status} className="shrink-0 scale-90" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: Quick Actions & Help */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.quick_actions')}</h2>
          <div className="grid grid-cols-1 gap-3">
            <Button
              asChild
              className="h-auto flex-col gap-2 py-4 bg-white text-slate-700 border hover:bg-slate-50 hover:text-primary shadow-sm"
              variant="outline"
            >
              <Link to="/documents/new">
                <Plus className="h-5 w-5" />
                <span className="text-xs font-medium">{t('dashboard.new')}</span>
              </Link>
            </Button>
          </div>

          {/* Mini Help Card */}
          <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-md mt-4">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-1">{t('dashboard.need_help')}</h3>
              <p className="text-xs text-indigo-100 mb-3 leading-relaxed">
                {t('dashboard.help_desc')}
              </p>
              <Button size="sm" variant="secondary" className="w-full text-xs h-8 bg-white/10 hover:bg-white/20 text-white border-0" asChild>
                <Link to="/help">{t('dashboard.view_tutorials')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
