import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, User, Mail, Check, Award, Loader2, AlertCircle, RotateCw, FileStack, Eye, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { downloadUrl, safeFilename } from "@/lib/download";
import { PdfPreviewDialog } from "@/components/documents/PdfPreviewDialog";

/**
 * Resolves a stored document reference (a storage path OR a public Supabase URL)
 * into a freshly-signed, fetchable URL. The `documents` bucket is private, so
 * the stored public URLs do not work directly — they must be re-signed.
 */
async function resolveStorageUrl(target: string): Promise<string> {
  let path = target;
  if (target.startsWith("http")) {
    if (target.includes("/documents/")) {
      path = target.split("/documents/")[1].split("?")[0];
    } else {
      return target; // external URL — use as-is
    }
  }
  path = decodeURIComponent(path);
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  return data?.signedUrl || target;
}

type TimelineEvent = {
  date: string;
  event: string;
  completed: boolean;
  isCertificate?: boolean;
};

import { queryKeys } from "@/lib/queryKeys";

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: queryKeys.documents.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error("No ID provided");

      return withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from("documents")
            .select("*")
            .eq("id", id)
            .single();
          if (error) throw error;
          return data;
        })(),
        3000, "Document detail fetch"
      );
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

      {/* Timeline / Audit Trail */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Award className="h-4 w-4 text-purple-600" />
          Trazabilidad y Evidencias
        </h3>
        <Card className="bg-slate-50/50 border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-6 relative ml-2">
              <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-200 -z-10" />

              {timeline.map((item, index) => (
                <div key={index} className="flex gap-4 relative">
                  {/* Icon Status */}
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white z-10",
                      item.completed ? "border-primary text-primary" : "border-slate-300 text-slate-300",
                      item.isCertificate ? "border-purple-500 text-purple-600 bg-purple-50" : ""
                    )}
                  >
                    {item.isCertificate ? <Award className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </div>

                  {/* Content */}
                  <div className="pb-1">
                    <p className={cn("text-sm font-medium", item.completed ? "text-slate-900" : "text-slate-500")}>
                      {item.event}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {item.date}
                    </p>

                    {/* Visual extra for "Certified" */}
                    {item.isCertificate && (
                      <p className="text-[10px] text-purple-600 mt-1 bg-purple-50 inline-block px-1.5 py-0.5 rounded border border-purple-100">
                        Sellado de Tiempo (TSA) + Firma Digital
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
              <p className="text-xs text-muted-foreground">
                ID del Documento: <span className="font-mono text-slate-500 select-all">{doc.id}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        {/* ME-10: vista previa inline (sin descargar) */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={loadingPreview}
          onClick={async () => {
            const target = doc.signed_file_url || doc.file_url;
            if (!target) {
              toast.error("No hay documento para previsualizar");
              return;
            }
            setLoadingPreview(true);
            try {
              const url = await resolveStorageUrl(target);
              const res = await fetch(url);
              if (!res.ok) throw new Error("fetch failed");
              const blob = await res.blob();
              setPreviewFile(
                new File([blob], `${doc.title || "documento"}.pdf`, { type: "application/pdf" })
              );
              setPreviewOpen(true);
            } catch (e) {
              if (import.meta.env.DEV) console.error("Error loading preview:", e);
              toast.error("No se pudo cargar la vista previa");
            } finally {
              setLoadingPreview(false);
            }
          }}
        >
          {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Vista previa
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={async () => {
            const target = doc.signed_file_url || doc.file_url;
            if (!target) {
              toast.error("No hay documento disponible para descargar");
              return;
            }
            const toastId = toast.loading("Preparando descarga...");
            try {
              const url = await resolveStorageUrl(target);
              const suffix = doc.status === "signed" ? "-firmado" : "";
              await downloadUrl(url, safeFilename(`${doc.title || "documento"}${suffix}`));
              toast.dismiss(toastId);
            } catch (e) {
              if (import.meta.env.DEV) console.error("Error downloading document:", e);
              toast.error("No se pudo descargar el documento", { id: toastId });
            }
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
            onClick={async () => {
              const toastId = toast.loading("Preparando certificado...");
              const filename = safeFilename(`certificado-${doc.title || "evidencias"}`);
              try {
                // Primary path: the certificate URL is already stored on the document.
                if (doc.certificate_url) {
                  const url = await resolveStorageUrl(doc.certificate_url);
                  await downloadUrl(url, filename);
                  toast.dismiss(toastId);
                  return;
                }

                // Fallback: the certificate may have been generated after this row
                // was cached, or stored only behind the signing endpoint. Ask it
                // for a fresh signed certificate URL using the document's token.
                if (doc.sign_token) {
                  const { data } = await supabase.functions.invoke("get-file-for-signing", {
                    body: { sign_token: doc.sign_token },
                  });
                  if (data?.certificate_url) {
                    await downloadUrl(data.certificate_url, filename);
                    toast.dismiss(toastId);
                    return;
                  }
                }

                toast.error(
                  "El certificado de evidencias aún se está generando. Inténtalo de nuevo en unos minutos.",
                  { id: toastId }
                );
              } catch (e) {
                if (import.meta.env.DEV) console.error("Error downloading certificate:", e);
                toast.error("No se pudo descargar el certificado", { id: toastId });
              }
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
                // Regenerate sign token + expiry. NO tocamos 'status' aquí:
                // el trigger guard_document_status bloquea que el cliente lleve
                // un documento a 'sent'. Esa transición la hace send-invite-v2
                // (server-side) en el camino de reenvío, sin cobrar crédito.
                const newToken = crypto.randomUUID();
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 7);

                const { error: updateError } = await supabase
                  .from('documents')
                  .update({
                    sign_token: newToken,
                    expires_at: newExpiry.toISOString()
                  })
                  .eq('id', doc.id);

                if (updateError) throw updateError;

                const { data: { user } } = await withTimeout(
                  supabase.auth.getUser(),
                  3000, "Auth user"
                );

                // Get sender name safely
                let senderName = 'Usuario';
                if (user) {
                  const { data: userProfile } = await withTimeout(
                    supabase.from('users').select('name').eq('id', user.id).single(),
                    3000, "User profile"
                  );
                  if (userProfile?.name) senderName = userProfile.name;
                  else if (user.user_metadata?.full_name) senderName = user.user_metadata.full_name;
                }

                // Re-invoke send-invite-v2
                const { data: fnData, error: sendError } = await withTimeout(
                  supabase.functions.invoke('send-invite-v2', {
                    body: {
                      document_id: doc.id,
                      signer_email: doc.signer_email,
                      signer_name: doc.signer_name,
                      sign_token: newToken,
                      sender_name: senderName,
                      title: doc.title
                    }
                  }),
                  3000, "Resend invite"
                );

                if (sendError) throw sendError;
                if (fnData && (fnData.error || fnData.success === false)) {
                  throw new Error(fnData.error || "Error al enviar invitación");
                }

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

        {/* ME-08: anular un documento ya enviado (no firmado) */}
        {(doc.status === 'sent' || doc.status === 'viewed') && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            disabled={cancelling}
            onClick={async () => {
              if (!window.confirm("¿Anular este documento? El firmante ya no podrá firmarlo y esta acción no se puede deshacer.")) return;
              setCancelling(true);
              try {
                // El trigger guard_document_status permite la transición a
                // 'cancelled' desde contexto de usuario (a diferencia de
                // 'sent'/'signed', que son server-side).
                const { error } = await supabase
                  .from('documents')
                  .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                  .eq('id', doc.id);
                if (error) throw error;
                toast.success("Documento anulado");
                navigate(0);
              } catch (e) {
                if (import.meta.env.DEV) console.error("Error cancelling document:", e);
                toast.error("No se pudo anular el documento");
              } finally {
                setCancelling(false);
              }
            }}
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Anular documento
          </Button>
        )}

        {/* ME-04: guardar como plantilla para reutilizar este documento */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={savingTemplate}
          onClick={async () => {
            setSavingTemplate(true);
            try {
              const { error } = await supabase.from('documents').insert({
                user_id: doc.user_id,
                title: doc.title,
                file_url: doc.file_url,
                status: 'draft',
                is_template: true,
                signer_name: doc.signer_name,
                signer_email: doc.signer_email,
                signer_phone: doc.signer_phone,
                signer_tax_id: doc.signer_tax_id,
                signer_address: doc.signer_address,
                custom_message: doc.custom_message,
                signature_type: doc.signature_type,
                security_level: doc.security_level,
                signature_page: doc.signature_page,
                signature_x: doc.signature_x,
                signature_y: doc.signature_y,
                original_format: doc.original_format,
              });
              if (error) throw error;
              toast.success("Guardado como plantilla", {
                description: "Lo encontrarás en la sección Plantillas.",
                action: { label: "Ver", onClick: () => navigate('/templates') },
              });
            } catch (e) {
              if (import.meta.env.DEV) console.error(e);
              toast.error("No se pudo guardar como plantilla");
            } finally {
              setSavingTemplate(false);
            }
          }}
        >
          {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
          Guardar como plantilla
        </Button>
      </div>

      {/* ME-10: diálogo de vista previa del PDF (renderizado con pdf.js) */}
      <PdfPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} file={previewFile} />
    </div>
  );
}
