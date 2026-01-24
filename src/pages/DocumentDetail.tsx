import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, FileText, User, Mail, Check, Award, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TimelineEvent = {
  date: string;
  event: string;
  completed: boolean;
  isCertificate?: boolean;
};

export default function DocumentDetail() {
  const { id } = useParams();

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID provided");
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando detalles...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-red-500 gap-4">
        <AlertCircle className="h-10 w-10" />
        <p>No se pudo cargar el documento</p>
        <Button asChild variant="outline">
          <Link to="/documents">Volver</Link>
        </Button>
      </div>
    );
  }

  // Build Timeline
  const timeline: TimelineEvent[] = [];

  if (doc.created_at) {
    timeline.push({
      date: format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
      event: "Creado",
      completed: true
    });
  }

  if (doc.sent_at) {
    timeline.push({
      date: format(new Date(doc.sent_at), "dd/MM/yyyy HH:mm", { locale: es }),
      event: "Enviado",
      completed: true
    });
  }

  if (doc.viewed_at) {
    timeline.push({
      date: format(new Date(doc.viewed_at), "dd/MM/yyyy HH:mm", { locale: es }),
      event: "Visto por firmante",
      completed: true
    });
  }

  if (doc.signed_at) {
    timeline.push({
      date: format(new Date(doc.signed_at), "dd/MM/yyyy HH:mm", { locale: es }),
      event: "Firmado",
      completed: true
    });
    // Assume certificate is generated immediately for now (or check certificate_url)
    timeline.push({
      date: format(new Date(doc.signed_at), "dd/MM/yyyy HH:mm", { locale: es }),
      event: "Certificado emitido",
      completed: true,
      isCertificate: true
    });
  }

  // Reverse to show newest first
  timeline.reverse();

  const signedDateStr = doc.signed_at
    ? format(new Date(doc.signed_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
    : "-";

  return (
    <div className="container space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/documents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Detalle del documento</h1>
      </div>

      {/* Document info */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{doc.title}</h2>
          </div>
        </div>

        {/* Status card */}
        {doc.status === 'signed' ? (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-3 text-lg font-semibold text-success">FIRMADO</p>
              <p className="text-sm text-muted-foreground">{signedDateStr}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <p className="text-lg font-semibold text-slate-600 uppercase">{doc.status || 'Borrador'}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Signer info */}
      <div className="space-y-3">
        <h3 className="font-medium">Firmante</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{doc.signer_name || "Sin nombre"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{doc.signer_email}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-3">
        <h3 className="font-medium">Cronología</h3>
        <div className="space-y-6 pl-2">
          {timeline.map((item, index) => (
            <div key={index} className="flex gap-4 relative">
              {/* Connector line */}
              {index < timeline.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-200 -z-10" />
              )}

              {/* Icon Status */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${item.completed
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-300 bg-white"
                  }`}
              >
                {item.completed && <Check className="h-3 w-3" />}
              </div>

              {/* Content */}
              <div className="pb-2">
                <p className={`text-sm font-medium ${item.completed ? "text-slate-900" : "text-slate-500"}`}>
                  {item.event}
                </p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
                {/* Visual extra for "Certified" */}
                {item.isCertificate && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-purple-50 p-2 text-xs text-purple-700 border border-purple-100">
                    <Award className="h-3 w-3" />
                    <span>Evidencia generada y sellada en blockchain</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => window.open(doc.signed_file_url || doc.file_url, '_blank')}
        >
          <Download className="h-4 w-4" />
          Descargar documento {doc.status === 'signed' ? 'firmado' : 'original'}
        </Button>
        {/* Certificate download - only if signed */}
        {doc.status === 'signed' && (
          <Button variant="outline" className="w-full justify-start gap-2" disabled>
            <FileText className="h-4 w-4" />
            Descargar certificado de evidencias (Próximamente)
          </Button>
        )}
      </div>
    </div>
  );
}
