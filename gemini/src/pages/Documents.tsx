import { Search, Plus, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { FileText } from "lucide-react";

// Mock data
const mockDocuments = [
  {
    id: "1",
    title: "Presupuesto diseño web",
    signerName: "Juan Pérez",
    signerEmail: "cliente@email.com",
    status: "sent" as DocumentStatus,
    createdAt: "20/01/2025",
  },
  {
    id: "2",
    title: "Contrato diseño logo",
    signerName: "María García",
    signerEmail: "otro@email.com",
    status: "signed" as DocumentStatus,
    createdAt: "18/01/2025",
  },
  {
    id: "3",
    title: "Propuesta mantenimiento",
    signerName: "Carlos López",
    signerEmail: "empresa@email.com",
    status: "viewed" as DocumentStatus,
    createdAt: "17/01/2025",
  },
  {
    id: "4",
    title: "Acuerdo colaboración",
    signerName: "Ana Martín",
    signerEmail: "ana@empresa.com",
    status: "expired" as DocumentStatus,
    createdAt: "10/01/2025",
  },
  {
    id: "5",
    title: "Contrato freelance",
    signerName: "Pedro Sánchez",
    signerEmail: "pedro@email.com",
    status: "signed" as DocumentStatus,
    createdAt: "08/01/2025",
  },
];

function DocumentCard({ doc }: { doc: (typeof mockDocuments)[0] }) {
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
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{doc.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground truncate">
                {doc.signerName} · {doc.signerEmail}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground">{doc.createdAt}</p>
            </div>
          </div>
        </div>
        <StatusBadge status={doc.status} className="shrink-0" />
      </div>
    </Link>
  );
}

export default function Documents() {
  const pendingDocs = mockDocuments.filter(
    (d) => d.status === "sent" || d.status === "viewed"
  );
  const signedDocs = mockDocuments.filter((d) => d.status === "signed");

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
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            Todos ({mockDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Pendientes ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="flex-1">
            Firmados ({signedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {mockDocuments.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pendingDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </TabsContent>

        <TabsContent value="signed" className="mt-4 space-y-2">
          {signedDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
