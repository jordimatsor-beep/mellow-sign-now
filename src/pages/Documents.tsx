import { Search, Plus, Filter, Loader2, AlertCircle } from "lucide-react";
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
      to={`/documents/${doc.id}`}
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

export default function Documents() {
  const [search, setSearch] = useState("");

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
            <div className="py-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
              No hay documentos encontrados.
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4 space-y-2">
          {draftDocs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
              No hay borradores. Los documentos aparecen aquí antes de enviarlos.
            </div>
          ) : (
            draftDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingDocs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
              No hay documentos pendientes.
            </div>
          ) : (
            pendingDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-4 space-y-2">
          {signedDocs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
              No hay documentos firmados.
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
