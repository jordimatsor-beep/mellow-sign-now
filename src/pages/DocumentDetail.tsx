import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, User, Mail, Check, Award, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

type TimelineEvent = {
  date: string;
  event: string;
  completed: boolean;
  isCertificate?: boolean;
};

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

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
                    <span>Evidencia digital generada y sellada con TSA</span>
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
          onClick={async () => {
            const target = doc.signed_file_url || doc.file_url;
            if (!target) return;

            let finalUrl = target;
            // Detect if it is a path or Supabase URL
            const isPath = !target.startsWith('http');
            const isSupabase = target.includes('supabase');

            if (isPath || isSupabase) {
              try {
                let path = target;
                if (target.startsWith('http') && target.includes('/documents/')) {
                  path = target.split('/documents/')[1];
                }

                if (path) {
                  const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600, { download: true });
                  if (data?.signedUrl) finalUrl = data.signedUrl;
                }
              } catch (e) {
                console.error("Error signing URL:", e);
              }
            }
            window.open(finalUrl, '_blank');
          }}
        >
          <Download className="h-4 w-4" />
          Descargar documento {doc.status === 'signed' ? 'firmado' : 'original'}
        </Button>

        {/* Certificate download */}
        {doc.status === 'signed' && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!doc.certificate_url}
            onClick={async () => {
              if (!doc.certificate_url) return;
              let finalUrl = doc.certificate_url;

              try {
                let path = doc.certificate_url;
                if (path.startsWith('http') && path.includes('/documents/')) {
                  path = path.split('/documents/')[1];
                }

                if (path) {
                  const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600, { download: true });
                  if (data?.signedUrl) finalUrl = data.signedUrl;
                }
              } catch (e) {
                console.error("Error signing cert:", e);
              }
              window.open(finalUrl, '_blank');
            }}
          >
            <FileText className="h-4 w-4" />
            Descargar certificado de evidencias
          </Button>
        )}

        {/* Resend button for pending/expired documents */}
        {doc.status !== 'signed' && doc.status !== 'draft' && (
          <Button
            variant="default"
            className="w-full justify-start gap-2"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              try {
                // Regenerate sign token
                const newToken = crypto.randomUUID();
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 7);

                const { error: updateError } = await supabase
                  .from('documents')
                  .update({
                    sign_token: newToken,
                    expires_at: newExpiry.toISOString(),
                    status: 'sent',
                    sent_at: new Date().toISOString()
                  })
                  .eq('id', doc.id);

                if (updateError) throw updateError;

                // Re-invoke send-document-invitation
                const { error: sendError } = await supabase.functions.invoke('send-document-invitation', {
                  body: {
                    document_id: doc.id,
                    signer_email: doc.signer_email,
                    signer_name: doc.signer_name,
                    sign_token: newToken,
                    sender_name: 'Usuario',
                    title: doc.title
                  }
                });

                if (sendError) throw sendError;

                toast.success('Documento reenviado correctamente');
                // Refresh page
                navigate(0);
              } catch (e) {
                if (import.meta.env.DEV) console.error('Resend error:', e);
                toast.error('Error al reenviar documento');
              } finally {
                setResending(false);
              }
            }}
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            Reenviar invitación
          </Button>
        )}
      </div>
    </div>
  );
}
