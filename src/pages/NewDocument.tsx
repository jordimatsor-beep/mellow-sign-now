import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, FileText, ArrowRight, Loader2, User, Lock, Unlock, Receipt, Wrench, FileSignature, ClipboardList, MapPin, Check } from "lucide-react";
import { ContactSelector } from "@/components/contacts/ContactSelector";
import { ContactEmailAutocomplete } from "@/components/contacts/ContactEmailAutocomplete";
import { SignaturePositionPicker } from "@/components/documents/SignaturePositionPicker";
import { useProfile } from "@/context/ProfileContext";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PdfPreviewDialog } from "@/components/documents/PdfPreviewDialog";
import { LimitReachedModal } from "@/components/plan/LimitReachedModal";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { sanitizeFileName } from "@/lib/utils";
import { ACCEPTED_OFFICE_FORMATS, OFFICE_MIME_TYPES, getOriginalFormat } from "@/lib/documentFormats";

type Step = "doctype" | "upload" | "signer" | "options" | "confirm";
type DocType = "presupuesto" | "parte" | "contrato" | "otro";

// ... existing imports ...

export default function NewDocument() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const templateId = searchParams.get('templateId');
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>("doctype");
  const [docType, setDocType] = useState<DocType | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "creating_record" | "sending" | "success" | "error">("idle");
  const isSubmitting = uploadStatus !== "idle" && uploadStatus !== "error" && uploadStatus !== "success";

  // Modal de límite de plan alcanzado (HTTP 402 desde send-invite-v2)
  const [limitModal, setLimitModal] = useState<{ open: boolean; plan: "gratis" | "basico" | null; limite: number | null }>({
    open: false,
    plan: null,
    limite: null,
  });

  // Form Data
  const [file, setFile] = useState<File | null>(null);
  const [draftFileUrl, setDraftFileUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerNif, setSignerNif] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [signerPhonePrefix, setSignerPhonePrefix] = useState("+34");
  const [signerAddress, setSignerAddress] = useState("");

  const [signatureType, setSignatureType] = useState("full");
  const [securityLevel, setSecurityLevel] = useState<"standard" | "whatsapp_otp">("standard");
  const [whatsappVerification, setWhatsappVerification] = useState(false);

  const [customMessage, setCustomMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Multi-format upload. When `convertedFrom` is set, `file` is a PDF produced
  // from a non-PDF source (Word/Excel/etc.) by the convert-to-pdf edge function.
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFrom, setConvertedFrom] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch credits — single source of truth (RPC get_available_credits via
  // useCredits): excludes expired packs, matching both what consume_credit
  // can actually spend and what the sidebar badge shows. The previous local
  // query summed user_credit_purchases without the expiry filter and showed
  // inflated balances (e.g. 264 vs 122 real).
  const { credits, isLoading: isLoadingCredits, refetch: refetchCredits } = useCredits();

  // Signature position settings
  // IMPORTANT: signaturePage must match the default selected radio ("last_page" -> -1).
  // 0 means "annex page" in the backend; a 0 default caused signatures to land on an
  // appended page even though the UI showed "Ultima pagina" selected (bug fix 2026-06).
  const [signaturePosition, setSignaturePosition] = useState<"new_page" | "last_page" | "custom">("last_page");
  const [signaturePage, setSignaturePage] = useState(-1);
  // Sensible default when the user doesn't open the picker: bottom-center of the
  // last page (A4 points). The visual picker overrides these on confirm.
  const [signatureX, setSignatureX] = useState(200);
  const [signatureY, setSignatureY] = useState(80);
  // Default preset; the visual picker sets exact coordinates instead.
  const signaturePreset = "bottom-center";

  // Fields are optional for "presupuesto" type
  const isPresupuesto = docType === "presupuesto";

  const handleContactSelect = (contact: { name: string | null; email: string; phone?: string | null; nif?: string | null; address?: string | null }) => {
    setSignerName(contact.name || '');
    setSignerEmail(contact.email);
    if (contact.phone) setSignerPhone(contact.phone);
    if (contact.nif) setSignerNif(contact.nif);
    if (contact.address) setSignerAddress(contact.address);
    toast.success("Datos importados de la agenda");
  };

  // QW-05: tras un envío correcto, si el email no estaba en la agenda, ofrecer
  // guardarlo. Fire-and-forget: no debe bloquear ni retrasar la navegación.
  const offerSaveContact = async () => {
    try {
      const email = signerEmail.trim();
      if (!email) return;
      // RLS limita la consulta a los contactos del propio usuario.
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) return;

      toast("¿Guardar este firmante en tu agenda?", {
        description: signerName ? `${signerName} · ${email}` : email,
        action: {
          label: "Guardar contacto",
          onClick: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase.from("contacts").insert({
              user_id: user.id,
              name: signerName || email.split("@")[0],
              email,
              phone: signerPhone || null,
              nif: signerNif || null,
              address: signerAddress || null,
            });
            if (error) toast.error("No se pudo guardar el contacto");
            else toast.success("Contacto guardado en tu agenda");
          },
        },
      });
    } catch {
      /* el guardado de contacto nunca debe romper el flujo de envío */
    }
  };

  // Load draft data
  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) {
        toast.error("Error al cargar el borrador");
        if (import.meta.env.DEV) console.error(error);
        return;
      }

      if (data) {
        // Cast to any to access properties that might not be in the generated type definition yet
        const draft = data as any;
        setTitle(draft.title || '');
        setSignerName(draft.signer_name || '');
        setSignerEmail(draft.signer_email || '');
        setSignerNif(draft.signer_tax_id || ''); // Correct column name
        setSignerAddress(draft.signer_address || '');
        setSignerPhone(draft.signer_phone || '');
        setCustomMessage(draft.custom_message || '');

        // Restore signature position (guard against null from pre-migration rows)
        if (typeof draft.signature_page === 'number') setSignaturePage(draft.signature_page);
        if (typeof draft.signature_x === 'number') setSignatureX(draft.signature_x);
        if (typeof draft.signature_y === 'number') setSignatureY(draft.signature_y);

        // Restore specific position logic if possible (e.g. preset)
        if (draft.signature_page === 0) setSignaturePosition("new_page");
        else if (typeof draft.signature_page === 'number' && draft.signature_page > 0) setSignaturePosition("custom");
        else setSignaturePosition("last_page"); // -1 or null -> default

        // Restore security settings
        if (draft.security_level) {
          setSecurityLevel(draft.security_level);
          setWhatsappVerification(draft.security_level === 'whatsapp_otp');
        }

        if (draft.file_url) {
          // Store original URL to reuse on submit without re-downloading
          setDraftFileUrl(draft.file_url);
          setFile(new File([], draft.title ? `${draft.title}.pdf` : "documento_guardado.pdf", { type: "application/pdf" }));
        }

        if (draft.file_url) {
          setStep('signer');
          setDocType('otro');
        }
      }
    };

    loadDraft();
  }, [draftId]);

  // ME-04: usar una plantilla → se prerrellena un documento NUEVO (sin draftId,
  // así handleCreateDocument hace INSERT) reutilizando el archivo y los datos de
  // la plantilla. El archivo original es inmutable, por lo que referenciar el
  // mismo file_url no produce modificación cruzada.
  useEffect(() => {
    if (!templateId) return;

    const loadTemplate = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !data) {
        toast.error("No se pudo cargar la plantilla");
        if (import.meta.env.DEV) console.error(error);
        return;
      }

      const tpl = data as any;
      setTitle(tpl.title || '');
      setSignerName(tpl.signer_name || '');
      setSignerEmail(tpl.signer_email || '');
      setSignerNif(tpl.signer_tax_id || '');
      setSignerAddress(tpl.signer_address || '');
      setSignerPhone(tpl.signer_phone || '');
      setCustomMessage(tpl.custom_message || '');

      if (typeof tpl.signature_page === 'number') setSignaturePage(tpl.signature_page);
      if (typeof tpl.signature_x === 'number') setSignatureX(tpl.signature_x);
      if (typeof tpl.signature_y === 'number') setSignatureY(tpl.signature_y);
      if (tpl.signature_page === 0) setSignaturePosition("new_page");
      else if (typeof tpl.signature_page === 'number' && tpl.signature_page > 0) setSignaturePosition("custom");
      else setSignaturePosition("last_page");

      if (tpl.security_level) {
        setSecurityLevel(tpl.security_level);
        setWhatsappVerification(tpl.security_level === 'whatsapp_otp');
      }

      if (tpl.file_url) {
        setDraftFileUrl(tpl.file_url);
        setFile(new File([], tpl.title ? `${tpl.title}.pdf` : "documento.pdf", { type: "application/pdf" }));
        setDocType('otro');
        setStep('signer');
      }

      toast.success("Plantilla cargada. Revisa el firmante y envía.");
    };

    loadTemplate();
  }, [templateId]);

  // Calls the convert-to-pdf edge function (Gotenberg backend) and returns a
  // PDF File. Uses raw fetch (not supabase.functions.invoke) because the
  // response is binary; aborts after 90s to survive Gotenberg cold starts.
  const convertFileToPdf = async (originalFile: File): Promise<File> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesión expirada, vuelve a iniciar sesión");

    const formData = new FormData();
    formData.append("file", originalFile);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/convert-to-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { msg = (await res.json()).error ?? msg; } catch { /* respuesta no-JSON */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("La conversión devolvió un archivo vacío");
      const pdfName = originalFile.name.replace(/\.[^.]+$/, ".pdf");
      return new File([blob], pdfName, { type: "application/pdf" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("La conversión tardó demasiado. Inténtalo de nuevo.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Shared handler for file selection (input + drag&drop). PDFs are accepted
  // directly. Supported Office formats are auto-converted to PDF and
  // auto-accepted (seamless) so the user proceeds exactly as if they had
  // uploaded a PDF — only the original file format is recorded as evidence.
  const processSelectedFile = async (selectedFile: File) => {
    const lowerName = selectedFile.name.toLowerCase();
    const isPdf = selectedFile.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isOffice =
      OFFICE_MIME_TYPES.includes(selectedFile.type) ||
      ACCEPTED_OFFICE_FORMATS.some((ext) => lowerName.endsWith(ext));

    if (!isPdf && !isOffice) {
      toast.error("Formato no soportado", {
        description: "Acepta PDF, Word, Excel, PowerPoint, OpenDocument, RTF, TXT o CSV.",
      });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }

    // Native PDF: same behaviour as before.
    if (isPdf) {
      setFile(selectedFile);
      setConvertedFrom(null);
      if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, ""));
      return;
    }

    // Non-PDF supported format: inform, auto-convert, auto-accept.
    const originalFormat = getOriginalFormat(selectedFile);
    toast.info("Este archivo no es un PDF. Lo convertimos automáticamente a PDF…");
    setIsConverting(true);
    try {
      const pdfFile = await convertFileToPdf(selectedFile);
      setFile(pdfFile);
      setConvertedFrom(originalFormat);
      if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
      toast.success(`Convertido a PDF desde .${originalFormat}. Listo para continuar.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error en la conversión";
      toast.error(`No se pudo convertir el archivo: ${msg}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processSelectedFile(selectedFile);
    // Reset so re-selecting the same file fires onChange again.
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isConverting) return;
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) processSelectedFile(selectedFile);
  };

  const handleWhatsappToggle = (checked: boolean) => {
    setWhatsappVerification(checked);
    setSecurityLevel(checked ? "whatsapp_otp" : "standard");
  };

  const handleCreateDocument = async () => {
    if (!file || !title || !signerEmail || !signerName) return;

    if (credits <= 0) {
      toast.error("No tienes créditos suficientes", {
        description: "Necesitas al menos 1 crédito para enviar un documento.",
        action: {
          label: "Comprar créditos",
          onClick: () => navigate('/precios')
        }
      });
      return;
    }

    setUploadStatus("uploading");
    try {
      setUploadStatus("creating_record");

      let fileUrl = "";

      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        3000, "Auth user"
      );
      if (!user) throw new Error("No estás autenticado");

      // Reuse draft URL when user hasn't changed the file (placeholder has size 0)
      if (draftFileUrl && file.size === 0) {
        fileUrl = draftFileUrl;
      } else {
        const fileName = `${user.id}/${Date.now()}_${sanitizeFileName(file.name)}`;
        const { data: uploadData, error: uploadError } = await withTimeout(
          supabase.storage.from('documents').upload(fileName, file),
          10000, "File upload"
        );
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        fileUrl = publicUrlData.publicUrl;
      }

      let doc;
      let error;

      if (draftId) {
        // Update existing draft
        const { data: updatedDoc, error: updateError } = await supabase
          .from('documents')
          .update({
            title,
            file_url: fileUrl, // Update file URL (new version)
            status: 'draft', // Keep as draft initially (will optionally switch to sent below)
            signer_name: signerName,
            signer_email: signerEmail,
            signer_phone: signerPhone,
            signer_tax_id: signerNif || null,
            signer_address: signerAddress || null,
            custom_message: customMessage,
            signature_type: signatureType,
            expires_at: new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString(),
            // Don't update sign_token unless necessary, but safer to keep it or rotate it. 
            // If status was 'draft', token might be valid.
            security_level: securityLevel,
            signature_page: signaturePage,
            signature_x: signatureX,
            signature_y: signatureY,
            original_format: convertedFrom
          })
          .eq('id', draftId)
          .select()
          .single();

        doc = updatedDoc;
        error = updateError;
      } else {
        // Create new
        const { data: newDoc, error: insertError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            title,
            file_url: fileUrl,
            status: 'draft',
            signer_name: signerName,
            signer_email: signerEmail,
            signer_phone: signerPhone,
            signer_tax_id: signerNif || null,
            signer_address: signerAddress || null,
            custom_message: customMessage,
            signature_type: signatureType,
            expires_at: new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString(),
            sign_token: crypto.randomUUID(),
            security_level: securityLevel,
            signature_page: signaturePage,
            signature_x: signatureX,
            signature_y: signatureY,
            original_format: convertedFrom
          })
          .select()
          .single();

        doc = newDoc;
        error = insertError;
      }

      if (error) throw error;

      if (doc?.id) {
        setUploadStatus("sending");
        // Always pass sign_token. If it was a draft, it should have one. If we updated, we fetched it.
        // Wait, update().select() returns the object.
        await handleSendDocument(doc.id, user.id, doc.sign_token!);
      } else {
        setUploadStatus("error");
      }


    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error(error);
      const message = error instanceof Error ? error.message : "Error al enviar documento";
      toast.error(message);
      setUploadStatus("error");
    }
  };

  const handleSendDocument = async (docId: string, _userId: string, signToken: string) => {
    try {
      // El consumo de crédito y la transición del documento a 'sent' ocurren
      // DENTRO de send-invite-v2 (server-side), de forma atómica con el envío.
      // El cliente ya no consume créditos ni cambia el estado: así es imposible
      // enviar saltándose el cobro (antes era trivial desde la consola).
      const payload = {
        document_id: docId,
        signer_email: signerEmail,
        signer_name: signerName,
        sign_token: signToken,
        sender_name: profile?.name || profile?.email || 'Usuario',
        title: title,
        custom_message: customMessage
      };

      const { data: fnData, error: fnError } = await withTimeout(
        supabase.functions.invoke('send-invite-v2', { body: payload }),
        20000, "Send invite"
      );

      const result = fnData as { success?: boolean; code?: string; error?: string; plan?: string; limite?: number } | null;

      if (fnError || result?.success !== true) {
        const code = result?.code;

        // Límite del plan alcanzado → modal de upgrade (pack / mejorar plan).
        if (code === 'limite_alcanzado' || code === 'insufficient_credits') {
          setUploadStatus("error");
          const plan = result?.plan === 'basico' ? 'basico' : result?.plan === 'gratis' ? 'gratis' : null;
          setLimitModal({ open: true, plan, limite: result?.limite ?? null });
          return;
        }

        // Cualquier otro fallo: el servidor ya reembolsó el crédito (si lo cobró)
        // y dejó el documento como borrador.
        const errorMsg = result?.error || fnError?.message || "Error desconocido al enviar";
        if (import.meta.env.DEV) console.error("Error sending document:", fnError || result);
        toast.error(`No se pudo enviar: ${errorMsg}`);
        toast.info("El documento se ha guardado como borrador. Inténtalo de nuevo.");
        setUploadStatus("error");
        setTimeout(() => navigate('/dashboard'), 3500);
        return;
      }

      setUploadStatus("success");
      refetchCredits(); // el saldo cambió en el servidor — refresca el badge
      toast.success("Documento enviado correctamente");
      offerSaveContact(); // QW-05: ofrecer guardar el firmante (no bloqueante)
      navigate('/dashboard');

    } catch (error: unknown) {
      const err = error as Error;
      if (import.meta.env.DEV) console.error("Critical error in handleSendDocument:", err);
      // Si se cobró un crédito, send-invite-v2 lo reembolsa ante el fallo.
      toast.error("Error al enviar: " + err.message);
      setUploadStatus("error");
      navigate('/dashboard');
    }
  };

  const docTypes = [
    { value: "presupuesto" as DocType, icon: Receipt, label: "Presupuesto", emoji: "💰" },
    { value: "parte" as DocType, icon: Wrench, label: "Parte de Trabajo", emoji: "🛠️" },
    { value: "contrato" as DocType, icon: FileSignature, label: "Contrato", emoji: "📄" },
    { value: "otro" as DocType, icon: ClipboardList, label: "Otro", emoji: "📋" },
  ];

  const renderStep = () => {
    switch (step) {
      case "doctype":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">¿Qué vas a enviar?</h2>
            <div className="grid grid-cols-2 gap-3">
              {docTypes.map((type) => (
                <div
                  key={type.value}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer transition-all hover:bg-slate-50 hover:border-primary/50 ${docType === type.value ? "ring-2 ring-primary border-transparent bg-primary/5" : "bg-white"
                    }`}
                  onClick={() => setDocType(type.value)}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-sm font-medium text-center">{type.label}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={!docType}
              onClick={() => setStep("upload")}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case "upload":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Subir documento</h2>

            <div
              className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:bg-muted/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mb-2 text-sm text-muted-foreground">
                Arrastra tu documento aquí o
              </p>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="secondary" size="sm" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.doc,.odt,.rtf,.xlsx,.xls,.ods,.pptx,.ppt,.odp,.txt,.csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isConverting}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                PDF, Word, Excel, PowerPoint y más · Máximo 10MB
              </p>
            </div>

            {isConverting && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                <span className="text-sm text-amber-800">Convirtiendo tu documento a PDF…</span>
              </div>
            )}

            {file && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  {convertedFrom && (
                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      .{convertedFrom} → PDF
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => {
                      setFile(null);
                      setConvertedFrom(null);
                    }}
                  >
                    Cambiar
                  </Button>
                </div>

                {convertedFrom && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-800">
                      Convertido a PDF desde .{convertedFrom}
                    </p>
                    <p className="mt-0.5 text-xs text-green-700">
                      Revisa que el contenido se ve bien antes de enviarlo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="mt-1 inline-flex text-xs text-green-700 underline hover:text-green-900"
                    >
                      Ver PDF para revisar →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título del documento</Label>
              <Input
                id="title"
                placeholder="Ej: Presupuesto reforma cocina"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={!file || !title || isConverting} onClick={() => setStep("signer")}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case "signer":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">¿Quién debe firmar?</h2>
              <Button variant="outline" size="sm" onClick={() => setIsContactSelectorOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre / Razón Social *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Juan Pérez"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <ContactEmailAutocomplete
                    id="email"
                    placeholder="Ej: juan@email.com"
                    value={signerEmail}
                    onChange={setSignerEmail}
                    onSelect={handleContactSelect}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nif">
                    CIF / NIF {!isPresupuesto && "*"}
                    {isPresupuesto && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}
                  </Label>
                  <Input
                    id="nif"
                    placeholder="Ej: 12345678Z"
                    value={signerNif}
                    onChange={(e) => setSignerNif(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    Dirección {!isPresupuesto && "*"}
                    {isPresupuesto && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}
                  </Label>
                  <Input
                    id="address"
                    placeholder="Calle, Ciudad..."
                    value={signerAddress}
                    onChange={(e) => setSignerAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* WhatsApp Security Toggle - Prominent Card */}
              <div className={`rounded-xl border-2 p-4 transition-all ${whatsappVerification
                ? 'border-green-500 bg-green-50/50 shadow-sm'
                : 'border-dashed border-muted-foreground/30 bg-muted/20'
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${whatsappVerification ? 'bg-green-100' : 'bg-muted'
                      }`}>
                      {whatsappVerification ? (
                        <Lock className="h-5 w-5 text-green-600" />
                      ) : (
                        <Unlock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        🔒 Activar Seguridad Extra (Código por SMS)
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        El firmante recibirá el enlace por Email, y un código OTP por SMS para firmar.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={whatsappVerification}
                    onCheckedChange={handleWhatsappToggle}
                    className="shrink-0"
                  />
                </div>

                {/* Conditional Phone Field */}
                {whatsappVerification && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Teléfono Móvil del Firmante *
                    </Label>
                    <div className="flex gap-2 mt-1.5">
                      <Select
                        value={signerPhonePrefix}
                        onValueChange={(value) => {
                          setSignerPhonePrefix(value);
                          // Update full phone with new prefix
                          const phoneNumber = signerPhone.replace(/^\+\d+\s*/, '');
                          if (phoneNumber) {
                            setSignerPhone(`${value} ${phoneNumber}`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue placeholder="Prefijo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+34">🇪🇸 +34 España</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="600 123 456"
                        value={signerPhone.replace(/^\+\d+\s*/, '')}
                        onChange={(e) => {
                          const phoneNumber = e.target.value.replace(/[^\d\s]/g, '');
                          setSignerPhone(`${signerPhonePrefix} ${phoneNumber}`);
                        }}
                        className="flex-1"
                      />
                    </div>
                    {!signerPhone.replace(/^\+\d+\s*/, '').trim() && (
                      <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        ⚠️ El teléfono móvil es obligatorio para el código SMS
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                disabled={
                  !signerName ||
                  !signerEmail ||
                  (!isPresupuesto && (!signerNif || !signerAddress)) ||
                  (whatsappVerification && !signerPhone.replace(/^\+\d+\s*/, '').trim())
                }
                onClick={() => setStep("options")}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "options":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Opciones adicionales</h2>

            {/* Signature Type simplified to single option */}
            <div className="rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Firma Digital Estándar (eIDAS)</p>
                  <p className="text-xs text-muted-foreground">
                    Incluye sello de tiempo y certificado de evidencias.
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Position — visual picker only */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                ¿Dónde firma el cliente?
              </Label>

              {signaturePosition === "custom" && signaturePage > 0 ? (
                /* Posición ya elegida con el picker */
                <div className="rounded-xl border-2 border-green-500/60 bg-green-50/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800">¡Posición de la firma elegida!</p>
                      <p className="text-xs text-green-700">
                        Página {signaturePage} · puedes cambiarla cuando quieras
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full border-primary/40 text-primary hover:bg-primary/5"
                    onClick={() => {
                      if (!file) { toast.error("Sube primero el documento"); return; }
                      setIsPickerOpen(true);
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Cambiar posición
                  </Button>
                </div>
              ) : (
                /* Aún no elegida: mini-tutorial + botón principal */
                <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Coloca la firma justo donde la quieres en tu documento
                  </p>
                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
                      Pulsa el botón de abajo para ver tu documento
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                      <span>
                        Arrastra el recuadro{" "}
                        <span className="mx-0.5 whitespace-nowrap rounded border border-dashed border-primary bg-primary/10 px-1 font-medium text-primary">✍ Firma aquí</span>{" "}
                        hasta el sitio exacto
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
                      Pulsa «Confirmar posición» y listo
                    </li>
                  </ol>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      if (!file) { toast.error("Sube primero el documento"); return; }
                      setIsPickerOpen(true);
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Elegir dónde firma el cliente
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Si no eliges, la firma irá abajo en la última página.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensaje para el firmante (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Ej: Hola Juan, te envío el presupuesto que comentamos."
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Plazo para firmar</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 días</SelectItem>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="15">15 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => setStep("confirm")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadStatus === 'uploading' && "Subiendo archivo..."}
                  {uploadStatus === 'creating_record' && "Guardando datos..."}
                  {uploadStatus === 'sending' && "Enviando invitación..."}
                </>
              ) : (
                <>
                  Revisar y enviar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirmar envío</h2>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{title}</p>
                    <p className="text-sm text-muted-foreground">
                      {docTypes.find(d => d.value === docType)?.label || "Documento"}
                  {file && file.size > 0 ? ` • ${(file.size / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firmante</span>
                <div className="text-right">
                  <p>{signerName}</p>
                  <p className="text-xs text-muted-foreground">{signerEmail}</p>
                  {signerNif && <p className="text-xs text-muted-foreground">NIF: {signerNif}</p>}
                  {signerPhone && <p className="text-xs text-muted-foreground">{signerPhone}</p>}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de firma</span>
                <span>
                  Firma Digital Estándar
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seguridad</span>
                <span className="flex items-center gap-1">
                  {whatsappVerification ? (
                    <>
                      <Lock className="h-3 w-3 text-primary" />
                      SMS OTP
                    </>
                  ) : (
                    "Estándar"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plazo</span>
                <span>{expiresInDays} días</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posición firma</span>
                <span>
                  {signaturePosition === "new_page" && "Página nueva"}
                  {signaturePosition === "last_page" && `Última pág. (${signaturePreset === 'bottom-right' ? 'Abajo derecha' :
                    signaturePreset === 'bottom-left' ? 'Abajo izquierda' :
                      signaturePreset === 'bottom-center' ? 'Abajo centro' :
                        signaturePreset === 'center' ? 'Centro' : signaturePreset
                    })`}
                  {signaturePosition === "custom" && `Pág. ${signaturePage} (${signatureX}, ${signatureY})`}
                </span>
              </div>
              {convertedFrom && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formato original</span>
                  <span className="flex items-center gap-1">
                    .{convertedFrom} → PDF
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="underline"
                    >
                      revisar
                    </button>
                  </span>
                </div>
              )}
            </div>

            <div className={`rounded-lg p-3 text-center ${credits <= 0 && !isLoadingCredits ? 'bg-destructive/10' : 'bg-primary/5'}`}>
              {isLoadingCredits ? (
                <p className="text-sm text-muted-foreground">Verificando créditos disponibles...</p>
              ) : credits <= 0 ? (
                <>
                  <p className="text-sm text-destructive font-medium">Sin créditos disponibles</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <button className="underline" onClick={() => navigate('/precios')}>Comprar créditos</button> para enviar este documento
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm">
                    💳 Se usará <strong>1 crédito</strong> · Disponibles: <strong>{credits}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">(Se descontará al enviar)</p>
                </>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateDocument}
              disabled={isSubmitting || isLoadingCredits || credits <= 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : isLoadingCredits ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando créditos...
                </>
              ) : credits <= 0 ? (
                'Sin créditos disponibles'
              ) : (
                'Enviar documento'
              )}
            </Button>
          </div>
        );
    }
  };

  // Pasos del flujo con etiqueta visible (QW-02: numeración + nombre, N1 Nielsen).
  const STEPS: { key: Step; label: string }[] = [
    { key: "doctype", label: "Tipo" },
    { key: "upload", label: "Documento" },
    { key: "signer", label: "Firmante" },
    { key: "options", label: "Opciones" },
    { key: "confirm", label: "Revisión" },
  ];
  const steps = STEPS.map((s) => s.key);
  const currentIndex = steps.indexOf(step);

  return (
    <div className="mx-auto max-w-xl py-4 space-y-6">
      <div className="flex items-center gap-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (currentIndex === 0) {
              navigate("/dashboard");
            } else {
              setStep(steps[currentIndex - 1] as Step);
            }
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Nuevo Documento</h1>
      </div>

      {/* Stepper con número y nombre de paso (QW-02). En móvil basta la línea
          "Paso X de N · Nombre"; en >=sm se muestra además la etiqueta bajo cada barra. */}
      <div className="mx-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">
            Paso {currentIndex + 1} de {steps.length}
          </p>
          <p className="text-sm font-semibold text-primary">
            {STEPS[currentIndex].label}
          </p>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  currentIndex >= i ? "bg-primary" : "bg-slate-200"
                }`}
              />
              <span
                className={`mt-1 hidden text-[10px] sm:block ${
                  currentIndex === i ? "font-semibold text-primary" : "text-slate-400"
                }`}
              >
                {i + 1}. {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-muted/40 shadow-lg">
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      <SignaturePositionPicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        file={file}
        fileUrl={draftFileUrl}
        initialPage={signaturePage > 0 ? signaturePage : undefined}
        initialX={signatureX}
        initialY={signatureY}
        onConfirm={(pos) => {
          setSignaturePosition("custom");
          setSignaturePage(pos.page);
          setSignatureX(pos.x);
          setSignatureY(pos.y);
          toast.success(`Firma colocada en la página ${pos.page}`);
        }}
      />

      <ContactSelector
        isOpen={isContactSelectorOpen}
        onClose={() => setIsContactSelectorOpen(false)}
        onSelect={handleContactSelect}
      />

      {/* Preview del PDF convertido renderizado con pdf.js (sin descargas) */}
      <PdfPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        file={file}
        label={convertedFrom ? `convertido desde .${convertedFrom}` : undefined}
      />

      {/* Límite de plan alcanzado al enviar → opciones de pack / upgrade */}
      <LimitReachedModal
        open={limitModal.open}
        onOpenChange={(open) => setLimitModal((s) => ({ ...s, open }))}
        plan={limitModal.plan}
        limite={limitModal.limite}
      />
    </div>
  );
}
