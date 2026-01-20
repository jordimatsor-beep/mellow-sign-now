import { useEffect, useState } from "react";
import { Plus, Sparkles, FileText, Clock, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Buenos días, {userName}
        </h1>
        <p className="text-muted-foreground">
          Créditos disponibles: <span className="font-semibold text-foreground">{stats.credits}</span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          asChild
          className="h-auto flex-col gap-2 py-6"
          size="lg"
        >
          <Link to="/documents/new">
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Nuevo documento</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto flex-col gap-2 py-6 border-2 border-dashed"
          size="lg"
        >
          <Link to="/clara">
            <Sparkles className="h-6 w-6" />
            <span className="text-sm font-medium">Asistente Clara</span>
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-warning shadow-sm transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendientes de firma</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success shadow-sm transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Check className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Firmados</p>
              <p className="text-2xl font-bold">{stats.signed}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total documentos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documentos recientes</h2>
          <Button variant="link" asChild className="text-sm">
            <Link to="/documents">Ver todos →</Link>
          </Button>
        </div>

        <div className="space-y-3">
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl bg-muted/20">
              No tienes documentos recientes
            </div>
          ) : (
            recentDocuments.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="group block rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
                      <FileText className="h-6 w-6 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-4">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {doc.signer_email}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} className="shrink-0" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
