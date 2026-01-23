import { useEffect, useState } from "react";
import { Plus, Sparkles, FileText, Clock, Check, Loader2, File } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useTranslation } from 'react-i18next';

interface Document {
  id: string;
  title: string;
  signer_email: string;
  status: DocumentStatus;
  created_at: string;
  sent_at?: string;
  signed_at?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";

  const [documents, setDocuments] = useState<Document[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Documents (RLS filtered)
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('id, title, signer_email, status, created_at, sent_at, signed_at')
          .order('created_at', { ascending: false });

        if (docsError) throw docsError;
        setDocuments(docsData as unknown as Document[]);

        // 2. Fetch Credits (via RPC or View)
        // Using RPC for simplicity and security
        const { data: creditsData, error: creditsError } = await supabase
          .rpc('get_available_credits', { p_user_id: user.id });

        if (creditsError) {
          console.error("Error fetching credits:", creditsError);
          setCredits(0);
        } else {
          setCredits(creditsData as number);
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate stats
  const stats = {
    pending: documents.filter(d => ['sent', 'viewed'].includes(d.status)).length,
    signed: documents.filter(d => d.status === 'signed').length,
    total: documents.length,
    credits: credits ?? 0
  };

  const recentDocuments = documents.slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('dashboard.greeting')}, {userName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="font-semibold text-foreground">{stats.credits}</span> {t('dashboard.credits_available')}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link to="/documents/new">{t('dashboard.create_document')}</Link>
        </Button>
      </div>

      {/* Stats Grid - Denser */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="border shadow-sm bg-white hover:border-slate-300 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('dashboard.stats.pending')}</p>
              <p className="text-xl font-bold text-slate-900">{stats.pending}</p>
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
              <p className="text-xl font-bold text-slate-900">{stats.signed}</p>
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
              <p className="text-xl font-bold text-slate-900">{stats.total}</p>
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
            {recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <File className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">{t('dashboard.no_documents')}</h3>
                <p className="text-xs text-slate-500 mb-4 mt-1">{t('dashboard.no_documents_desc')}</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/documents/new">
                    {t('dashboard.create_first')}
                  </Link>
                </Button>
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
          <div className="grid grid-cols-2 gap-3">
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
            <Button
              asChild
              variant="outline"
              className="h-auto flex-col gap-2 py-4 border-dashed bg-gradient-to-br from-indigo-50/50 to-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all duration-300"
            >
              <Link to="/clara">
                <div className="relative">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                </div>
                <span className="text-xs font-medium">{t('dashboard.clara_ai')}</span>
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
