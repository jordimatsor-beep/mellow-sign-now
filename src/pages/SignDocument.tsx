import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Check, Download, Eraser, Loader2, AlertCircle, Shield, Clock, Hash, Smartphone, Eye, PenLine, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import type { DocumentForSigning } from "@/integrations/supabase/helpers";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { PdfModal } from "@/components/pdf/PdfModal";
import { downloadUrl, safeFilename } from "@/lib/download";



interface DocumentData {
  id: string;
  title: string;
  file_url: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'; // Strict type
  signer_email: string;
  signer_name: string;
  created_at: string;
  issuer_data?: {
    name: string;
    is_company?: boolean;
    id?: string;
    email?: string;
    phone?: string;
  };
  sender_name?: string;
  signedAt?: string;
  signer_phone?: string;
  security_level?: 'standard' | 'whatsapp_otp';
  whatsapp_verification?: boolean;
  signed_file_url?: string;
  certificate_url?: string;
  // Internal fields from RPC
  otp_code_hash?: string;
  otp_expires_at?: string;
  message?: string;
}

export default function SignDocument() {
  const { token } = useParams();

  // Consolidated State
  const [step, setStep] = useState<"loading" | "view" | "signing" | "otp" | "success" | "error" | "complete">("loading");
  const [accepted, setAccepted] = useState(false);
  const [canAccept, setCanAccept] = useState(false); // Scroll trap
  const [name, setName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signFormRef = useRef<HTMLDivElement>(null);

  const [docData, setDocData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpChannel, setOtpChannel] = useState<"sms" | "email">("sms");
  const [resendCooldown, setResendCooldown] = useState(0);

  // In-app PDF viewer modal
  const [viewerOpen, setViewerOpen] = useState(false);

  // PDF state — raw bytes for rendering + blob URL for download/modal
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Fetch PDF once; derive both the Uint8Array (for pdf.js) and blob URL (for download).
  useEffect(() => {
    if (!docData?.file_url) return;

    let active = true;
    let objectUrl: string | null = null;

    const fetchPdf = async () => {
      try {
        const res = await fetch(docData.file_url);
        if (!res.ok) throw new Error("Failed to load PDF");
        const buffer = await res.arrayBuffer();
        if (!active) return;
        const bytes = new Uint8Array(buffer);
        const blob = new Blob([bytes], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(blob);
        setPdfBytes(bytes);
        setPdfBlobUrl(objectUrl);
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    };

    fetchPdf();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docData?.file_url]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Extracts a human-readable error from a Supabase Edge Function response.
  // `supabase.functions.invoke` returns the error in `error.context` (a Response)
  // for non-2xx replies, OR inside `data` ({ success:false, error }) for 2xx.
  const extractFnError = async (fnError: any, fnData: any): Promise<string | null> => {
    if (fnError) {
      let body: any = null;
      try {
        const ctx = fnError.context;
        if (ctx && typeof ctx.json === "function") body = await ctx.json();
      } catch {
        /* response body not JSON */
      }
      return body?.error || body?.message || fnError.message || "Error al enviar el código";
    }
    if (fnData && (fnData.success === false || fnData.error)) {
      return fnData.error || "Error al enviar el código";
    }
    return null;
  };

  // Sends the OTP through the given channel. Returns true on success.
  const sendOtp = async (channel: "sms" | "email"): Promise<boolean> => {
    const label = channel === "sms" ? "SMS" : "email";
    const toastId = toast.loading(`Enviando código de seguridad por ${label}...`);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { token, channel },
      });
      const message = await extractFnError(error, data);
      if (message) throw new Error(message);

      toast.success(`Código enviado por ${label}`, { id: toastId });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo enviar el código";
      toast.error(message, { id: toastId });
      return false;
    }
  };

  const handleResendOtp = async (channel: "sms" | "email") => {
    if (resendCooldown > 0) return;
    setResendCooldown(60); // Start 60s cooldown
    const ok = await sendOtp(channel);
    if (!ok) setResendCooldown(0); // Reset cooldown on error so they can retry
  };



  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for sharp lines
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear and setup
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  }, []);

  // Canvas event handlers
  const getPointerPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPointerPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, getPointerPos]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPointerPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, getPointerPos]);

  // Scroll trap - enable acceptance once the reader reaches the end of the PDF.
  // The PdfViewer renders to canvas and reports this reliably across browsers.
  const handleReachedEnd = useCallback(() => {
    setCanAccept((prev) => {
      if (!prev) toast.success("Ahora puedes aceptar el documento");
      return true;
    });
  }, []);

  // Initialize canvas when showing drawing area
  useEffect(() => {
    if (step === 'view') {
      setTimeout(initCanvas, 100);
    }
  }, [step, initCanvas]);

  // Fetch Document Data
  useEffect(() => {
    if (!token) {
      setStep("error");
      setError("Token no válido");
      return;
    }

    async function loadDocumentLink() {
      try {
        const docRecord = await withTimeout(
          (async () => {
            const { data, error } = await supabase
              .rpc('get_document_for_signing', { token_uuid: token as string });
            if (error) throw error;
            const rpcResult = data as DocumentForSigning[] | null;
            const doc = rpcResult?.[0];
            if (!doc) throw new Error("Documento no encontrado o enlace inválido");
            return doc;
          })(),
          15000, "Document fetch"
        );

        if (docRecord.status !== 'sent' && docRecord.status !== 'viewed' && docRecord.status !== 'signed') {
          throw new Error("Este documento no está disponible para firma");
        }

        // Check Expiration
        if (docRecord.expires_at && new Date(docRecord.expires_at) < new Date()) {
          throw new Error("Este enlace de firma ha caducado (expiró el " + format(new Date(docRecord.expires_at), "dd/MM/yyyy", { locale: es }) + ")");
        }

        if (docRecord.status === 'sent') {
          // Use the secure RPC to mark as viewed (Bypasses RLS issues for recipients)
          supabase
            .rpc('mark_document_viewed', { token_uuid: token as string })
            .then(({ error }) => {
              if (error && import.meta.env.DEV) console.warn("Failed to mark as viewed:", error);
            });
        }

        // Obtain signed URLs for private bucket via Edge Function (uses service_role)
        let finalFileUrl = docRecord.file_url;
        let finalSignedFileUrl: string | undefined;
        let finalCertificateUrl: string | undefined;

        try {
          const { data: signingData, error: signingError } = await supabase.functions.invoke(
            'get-file-for-signing',
            { body: { sign_token: token } }
          );
          if (!signingError && signingData?.success) {
            if (signingData.file_url) finalFileUrl = signingData.file_url;
            if (signingData.signed_file_url) finalSignedFileUrl = signingData.signed_file_url;
            if (signingData.certificate_url) finalCertificateUrl = signingData.certificate_url;
          }
        } catch (e) {
          if (import.meta.env.DEV) console.error("Error fetching signed URLs:", e);
        }

        // Transform data to match our interface
        const doc: DocumentData = {
          id: docRecord.id,
          title: docRecord.title,
          file_url: finalFileUrl,
          status: docRecord.status,
          signer_email: docRecord.signer_email || '',
          signer_name: docRecord.signer_name || '',
          signer_phone: docRecord.signer_phone,
          created_at: docRecord.created_at || '',
          security_level: (docRecord.security_level as 'standard' | 'whatsapp_otp') || 'standard',
          whatsapp_verification: docRecord.whatsapp_verification,
          issuer_data: {
            name: docRecord.issuer_company || docRecord.issuer_name || "Emisor",
            is_company: !!docRecord.issuer_company,
            id: docRecord.issuer_tax_id,
            email: docRecord.issuer_email,
          },
          signed_file_url: finalSignedFileUrl,
          certificate_url: finalCertificateUrl,
          message: (docRecord as any).message || (docRecord as any).custom_message
        };

        setDocData(doc);
        setName(doc.signer_name || "");

        if (doc.status === 'signed') {
          setStep("complete");
        } else {
          setStep("view");
        }

      } catch (err: unknown) {
        const error = err as Error & { error_description?: string };
        if (import.meta.env.DEV) console.error("Error loading document:", error);
        setStep("error");
        // Handle Supabase errors (which are not always Error instances)
        const message = error?.message || error?.error_description || (typeof err === 'string' ? err : "Error al cargar el documento");
        setError(message);
      }
    }

    loadDocumentLink();
  }, [token]);

  // Helper: SHA-256 for client-side (still used for prompt, but backend does verification)


  const handleSign = async () => {
    if (!canvasRef.current || !docData) return;

    // Check if WhatsApp verification is required (security_level or legacy flag)
    // Assuming backend returns security_level in docData (we need to fetch it)
    // If docData was updated to include security_level check:
    const requiresOtp = docData.security_level === 'whatsapp_otp';

    if (requiresOtp) {
      // Auto-select the delivery channel instead of hard-requiring a phone:
      // use SMS when a phone is available, otherwise fall back to email
      // (signer_email is always present). This prevents a missing phone from
      // blocking the entire signature when email verification is possible.
      const channel: "sms" | "email" = docData.signer_phone ? "sms" : "email";

      if (channel === "email" && !docData.signer_email) {
        toast.error(
          "Este documento requiere verificación, pero no hay teléfono ni email del firmante. Contacta con el emisor."
        );
        return;
      }

      setOtpChannel(channel);
      const ok = await sendOtp(channel);
      if (ok) setStep("otp");
      return;
    }

    // Proceed with signature
    await submitSignature();
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Introduce el código completo de 6 dígitos");
      return;
    }
    setOtpError("");
    await submitSignature();
  };

  const submitSignature = async () => {
    if (!canvasRef.current || !docData) return;

    setStep("signing");
    const toastId = toast.loading("Procesando firma segura y evidencias...");

    try {
      const signatureImage = canvasRef.current.toDataURL("image/png");

      // Grab client metadata
      // Using generic external service for IP if possible, or letting backend handle it
      // Edge function will see the request IP.

      const { data, error } = await supabase.functions.invoke('sign-complete-v2', {
        body: {
          token,
          otp_code: otpCode || undefined,
          signature_image: signatureImage,
          user_agent: navigator.userAgent
          // ip_address: handled by backend
        }
      });

      if (error) {
        if (import.meta.env.DEV) console.error("Sign Error (Network):", error);

        // Try to extract the real error message from the response body
        let backendErrorMessage = "";
        try {
          const context = (error as { context?: { json?: () => Promise<{ error?: string; message?: string }> } }).context;
          if (context && typeof context.json === 'function') {
            const body = await context.json();
            backendErrorMessage = body?.error || body?.message || '';
          }
        } catch (e) {
          // Ignore parsing errors
        }

        const message = backendErrorMessage || error.message || "Error al procesar la firma";
        throw new Error(message);
      }

      if (data && (data.error || data.success === false)) {
        if (import.meta.env.DEV) console.error("Sign Error (Backend):", data);
        throw new Error(data.error || "Error al procesar la firma");
      }

      toast.success("Documento firmado y sellado correctamente", { id: toastId });
      
      // Reload the page to cleanly fetch the updated document state, which will now
      // include the `signed_file_url` and correctly show the completed step without race conditions.
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error(err);

      const message = err instanceof Error ? err.message : "Error al guardar la firma";
      toast.error(message, { id: toastId });
      setStep("view"); // Go back to view so they can try again
    }
  };

  if (step === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50">
        <div className="mb-4 scale-125">
          <Logo className="h-8" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Cargando documento seguro...</span>
        </div>
      </div>
    );
  }

  if (step === "error") {
    const isExpired = error.includes("caducado") || error.includes("expirado");
    const isNotFound = error.includes("no encontrado") || error.includes("inválido");
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
        <div className="mb-12">
          <Logo className="h-8" />
        </div>
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8 text-center space-y-4">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isExpired ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isExpired
              ? <Clock className={`h-8 w-8 text-amber-500`} />
              : <AlertCircle className="h-8 w-8 text-red-500" />
            }
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isExpired ? "Enlace caducado" : isNotFound ? "Enlace no válido" : "No se pudo cargar el documento"}
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
          {isExpired && (
            <p className="text-sm text-slate-500">
              Solicita al remitente que te envíe un nuevo enlace de firma.
            </p>
          )}
          {isNotFound && (
            <p className="text-sm text-slate-500">
              Comprueba que el enlace está completo o contacta con quien te lo envió.
            </p>
          )}
        </div>
        <p className="mt-6 text-xs text-slate-400 font-mono">{token}</p>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
        <div className="mb-8 scale-110">
          <Logo className="h-8" />
        </div>

        <Card className="max-w-lg w-full shadow-xl border-green-100 overflow-hidden">
          <div className="bg-green-50/50 p-8 flex flex-col items-center text-center border-b border-green-100/50">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 shadow-sm ring-4 ring-white">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Documento Firmado</h1>
            <p className="mt-2 text-muted-foreground">
              El proceso de firma se ha completado correctamente.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-1 text-sm text-green-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Certificado generado a las {docData?.signedAt ? new Date(docData.signedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="rounded-lg bg-slate-50 border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Garantías de Seguridad Aplicadas
              </h3>
              <div className="grid gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span>Integridad de contenido (SHA-256)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span>Sello de tiempo cualificado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span>Custodia legal de evidencias</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Hemos enviado una copia del documento firmado a tu correo electrónico <strong>{docData?.signer_email}</strong>.
              </p>
              <Button
                onClick={() => {
                  const target = docData?.signed_file_url || docData?.file_url;
                  if (!target) return;
                  downloadUrl(target, safeFilename(`${docData?.title || "documento"}-firmado`)).catch(
                    () => toast.error("No se pudo descargar el documento. Inténtalo de nuevo.")
                  );
                }}
                variant="outline"
                className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                <Download className="h-4 w-4" />
                Descargar copia firmada
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-sm text-muted-foreground opacity-60">
          Powered by FirmaClara | Seguridad y Confianza
        </p>
      </div>
    );
  }

  // Mobile sticky-CTA state: keeps the signing action visible at all times.
  const canSubmit = accepted && !!name.trim() && hasSignature;
  const scrollToSign = () => signFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="container space-y-6 px-4 pt-6 pb-28 lg:py-6 max-w-5xl mx-auto">
        {/* Document info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Documento para firmar
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {docData?.title || 'Documento sin título'}
            </h1>
          </div>
          {/* Navigation for Recipient */}
          <div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/" className="flex items-center gap-2 text-base font-semibold text-foreground/80 hover:text-primary transition-colors hover:scale-105 active:scale-95">Inicio</a>
            </Button>
          </div>
        </div>

        {/* Issuer Trust Card */}
        {docData?.issuer_data && (
          <div className="mx-auto max-w-lg rounded-lg border bg-slate-50/50 p-3 text-left">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Datos del Emisor (Verificado)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">{docData.issuer_data.is_company ? "Razón Social:" : "Nombre:"}</span>
                <p className="font-medium">{docData.issuer_data.name}</p>
              </div>
              {docData.issuer_data.id && (
                <div>
                  <span className="text-muted-foreground text-xs">NIF/CIF:</span>
                  <p className="font-medium">{docData.issuer_data.id}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sender Message */}
        {docData?.message && (
          <Alert className="bg-blue-50 border-blue-100">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
              </div>
              <div className="space-y-1">
                <AlertTitle className="text-blue-900 font-medium">Mensaje de {docData.sender_name || 'Remitente'}</AlertTitle>
                <AlertDescription className="text-blue-800">
                  "{docData.message}"
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}


        <div className="grid lg:grid-cols-2 gap-8">
          {/* PDF Viewer with scroll trap */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Revisar Documento</h2>
              {!canAccept ? (
                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-200">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-medium text-amber-700">
                    Desplázate hasta el final para continuar
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 border border-green-200">
                  <Check className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    Documento revisado
                  </span>
                </div>
              )}
            </div>

            {/* Open the document in an in-app modal (does not leave the app) */}
            <div className="flex justify-end mb-2">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled={!pdfBlobUrl} onClick={() => setViewerOpen(true)}>
                <Eye className="h-4 w-4" />
                Abrir Documento
              </Button>
            </div>
            <Card
              className={`h-[600px] w-full overflow-hidden transition-all ${canAccept ? 'bg-muted/10 ring-2 ring-green-200' : 'bg-muted/20'
                }`}
            >
              {pdfBytes ? (
                <PdfViewer
                  url={pdfBlobUrl ?? ""}
                  data={pdfBytes}
                  downloadName={safeFilename(docData?.title)}
                  onReachedEnd={handleReachedEnd}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando documento...</span>
                </div>
              )}
            </Card>
            {/* Scroll progress hint */}
            {!canAccept && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Desplaza hacia abajo para leer todo el documento</span>
              </div>
            )}
          </div>

          {/* Signing form */}
          <div ref={signFormRef} className="space-y-6 scroll-mt-4">
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4">Firmar Documento</h2>

              <div className="space-y-4">
                {/* Acceptance checkbox - disabled until scroll */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${canAccept
                    ? 'border-primary/20 hover:border-primary/50 hover:bg-primary/5 [&:has(:checked)]:ring-2 [&:has(:checked)]:ring-primary [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5'
                    : 'opacity-40 cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/30'
                    }`}
                >
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={(checked) => {
                      if (!canAccept) {
                        toast.error("Por favor, desplázate hasta el final del documento para poder aceptar.");
                        return;
                      }
                      setAccepted(checked === true);
                    }}
                    disabled={!canAccept}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium leading-tight block">
                      Acepto el contenido de este documento
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight block">
                      Consiento el uso de la firma electrónica simple conforme al Reglamento eIDAS (UE) 910/2014.
                    </span>
                  </div>
                </label>

                {/* Name input */}
                <div className="space-y-2">
                  <Label htmlFor="signerName">Tu nombre completo *</Label>
                  <Input
                    id="signerName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Escribe tu nombre"
                  />
                </div>

                {/* Signature canvas */}
                <div className="space-y-2">
                  <Label>Dibuja tu firma *</Label>
                  <div className="relative rounded-lg border bg-white overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={200}
                      className="w-full h-[200px] touch-none cursor-crosshair"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleMouseUp}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 pointer-events-none">
                        Firma aquí
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      Borrar firma
                    </Button>
                  </div>
                </div>

                {/* Security info */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Integridad SHA-256
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Sello temporal TSA
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Cumple eIDAS
                  </span>
                </div>

                {/* Submit button */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!accepted || !name.trim() || !hasSignature || step === 'signing'}
                  onClick={handleSign}
                >
                  {step === 'signing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Firmando...
                    </>
                  ) : (
                    'Firmar Documento'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={step === "otp"} onOpenChange={(open) => !open && setStep("view")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Verificación de Seguridad
            </DialogTitle>
            <DialogDescription>
              Por seguridad, introduce el código de 6 dígitos que hemos enviado por {otpChannel === "sms" ? "SMS" : "email"}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(val) => {
                setOtpCode(val);
                setOtpError("");
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {otpError && (
              <p className="text-sm text-red-500 font-medium animate-pulse">{otpError}</p>
            )}

            <div className="flex justify-center w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResendOtp(otpChannel)}
                disabled={resendCooldown > 0}
                className={resendCooldown > 0 ? "opacity-50" : ""}
              >
                {resendCooldown > 0
                  ? `Reenviar en ${resendCooldown}s`
                  : `Reenviar por ${otpChannel === "sms" ? "SMS" : "email"}`}
              </Button>
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-4">
            <Button variant="outline" onClick={() => setStep("view")}>
              Cancelar
            </Button>
            <Button onClick={handleOtpVerify} disabled={otpCode.length !== 6}>
              Verificar y Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-app document viewer (keeps the user inside the signing flow) */}
      <PdfModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={pdfBlobUrl}
        title={docData?.title || "Documento"}
        filename={safeFilename(docData?.title)}
      />

      {/* Sticky CTA (mobile): the signing action is never out of sight. */}
      {(step === "view" || step === "signing") && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
          {!canAccept ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-700">
              <ArrowDown className="h-4 w-4 animate-bounce" />
              Desliza para leer el documento
            </div>
          ) : canSubmit ? (
            <Button className="w-full" size="lg" disabled={step === "signing"} onClick={handleSign}>
              {step === "signing" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Firmando...</>
              ) : (
                <><PenLine className="mr-2 h-4 w-4" /> Firmar documento</>
              )}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={scrollToSign}>
              <PenLine className="mr-2 h-4 w-4" /> Ir a firmar
            </Button>
          )}
        </div>
      )}
    </>
  );
}
