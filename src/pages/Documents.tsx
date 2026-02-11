import { Search, Plus, Filter, Loader2, AlertCircle, Clock, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

// Document type matching Supabase
type Document = {
  id: string;
  title: string;
  signer_name: string | null;
  signer_email: string | null;
  status: string | null;
  created_at: string | null;
};

function DocumentCard({ doc }: { doc: Document }) {
  // Map status string to DocumentStatus type safely
  const status = (doc.status || 'draft') as DocumentStatus;

  // Format date
  const dateStr = doc.created_at
    ? format(new Date(doc.created_at), "dd/MM/yyyy", { locale: es })
    : "-";

  return (
    <Link
      to={status === 'draft' ? `/documents/new?draftId=${doc.id}` : `/documents/${doc.id}`}
      className="group block rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
            <FileText className="h-6 w-6 text-slate-500 group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{doc.title || "Sin título"}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground truncate">
                {doc.signer_name || "Sin firmante"} · {doc.signer_email || "-"}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground">{dateStr}</p>
            </div>
          </div>
        </div>
        <StatusBadge status={status} className="shrink-0" />
      </div>
    </Link>
  );
}

import { queryKeys } from "@/lib/queryKeys";

export default function Documents() {
  const [search, setSearch] = useState("");

  const { data: documents, isLoading, error } = useQuery({
    queryKey: queryKeys.documents.all,
    queryFn: async () => {
      // Safety timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Documents fetch timeout")), 5000)
      );

      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, signer_name, signer_email, status, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      })();

      return Promise.race([fetchPromise, timeoutPromise]) as Promise<any[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando documentos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-red-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error al cargar documentos</p>
        <p className="text-sm opacity-70">{(error as Error).message}</p>
      </div>
    );
  }

  const allDocs = documents || [];

  // Filter logic
  const filteredDocs = allDocs.filter(doc => {
    const matchesSearch = search.toLowerCase() === "" ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.signer_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (doc.signer_email?.toLowerCase() || "").includes(search.toLowerCase());

    return matchesSearch;
  });

  const pendingDocs = filteredDocs.filter(
    (d) => d.status === "sent" || d.status === "viewed"
  );
  const signedDocs = filteredDocs.filter((d) => d.status === "signed");
  const draftDocs = filteredDocs.filter((d) => d.status === "draft" || !d.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/documents/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o destinatario..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            Todos ({filteredDocs.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1">
            Borradores ({draftDocs.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Pendientes ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="flex-1">
            Firmados ({signedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay documentos</h3>
              <p className="text-xs text-slate-500 mb-4 mt-1">No se encontraron documentos que coincidan con tu búsqueda.</p>
              <Button size="sm" variant="outline" onClick={() => setSearch("")}>
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4 space-y-2">
          {draftDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay borradores</h3>
              <p className="text-xs text-slate-500 mb-4 mt-1">Los documentos guardados aparecerán aquí.</p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/documents/new">Crear nuevo</Link>
              </Button>
            </div>
          ) : (
            draftDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay pendientes</h3>
              <p className="text-xs text-slate-500 mb-4 mt-1">Todos tus envíos han sido completados o no has enviado nada aún.</p>
            </div>
          ) : (
            pendingDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-4 space-y-2">
          {signedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay firmados</h3>
              <p className="text-xs text-slate-500 mb-4 mt-1">Los documentos firmados aparecerán aquí.</p>
            </div>
          ) : (
            signedDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
