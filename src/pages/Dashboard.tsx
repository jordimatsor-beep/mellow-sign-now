import { useEffect, useState } from "react";
import { Plus, Sparkles, FileText, Clock, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const userName = "Usuario"; // Still static until auth
  const [documents, setDocuments] = useState<Document[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Documents
        const docsRes = await fetch('/api/documents');
        const docsData = await docsRes.json();
        if (Array.isArray(docsData)) {
          setDocuments(docsData);
        }

        // Fetch Credits
        const creditsRes = await fetch('/api/credits');
        const creditsData = await creditsRes.json();
        if (typeof creditsData.credits === 'number') {
          setCredits(creditsData.credits);
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    <div className="container space-y-6 px-4 py-6">
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documentos recientes</h2>
          <Button variant="link" asChild className="text-sm">
            <Link to="/documents">Ver todos →</Link>
          </Button>
        </div>

        <div className="space-y-2">
          {recentDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/20">
              No tienes documentos recientes
            </div>
          ) : (
            recentDocuments.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight truncate pr-4">{doc.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {doc.signer_email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
