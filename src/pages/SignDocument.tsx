import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Check, Download, Eraser, Loader2, AlertCircle, Shield, Clock, Hash, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { MulticentroLogo } from "@/components/brand/BrandHeader";

import { supabase } from "@/lib/supabase";

type SigningStep = "loading" | "error" | "view" | "signing" | "otp" | "complete";

interface DocumentData {
  id: string;
  title: string;
  file_url: string;
  status: string;
  signer_email: string;
  signer_name: string;
  created_at: string;
  issuer_data?: {
    name: string;
    id?: string;
    email?: string;
    phone?: string;
  };
  sender_name?: string;
  signedAt?: string;
  whatsapp_verification?: boolean;
  signer_phone?: string;
  security_level?: 'standard' | 'whatsapp_otp';
}

export default function SignDocument() {
  const { token } = useParams();
  const [step, setStep] = useState<SigningStep>("loading");
  const [accepted, setAccepted] = useState(false);
  const [canAccept, setCanAccept] = useState(false); // Scroll trap
  const [name, setName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");

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

  // Scroll trap - enable acceptance only after scrolling to bottom
  const handleScroll = useCallback(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const iframe = container.querySelector('iframe');
    if (iframe) {
      // For iframes, we can't easily detect scroll, so enable after 5 seconds as fallback
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (isAtBottom && !canAccept) {
      setCanAccept(true);
      toast.success("Ahora puedes aceptar el documento");
    }
  }, [canAccept]);

  // Auto-enable after timeout for PDF iframe (can't detect scroll in cross-origin iframe)
  useEffect(() => {
    if (step === 'view' && !canAccept) {
      const timer = setTimeout(() => {
        setCanAccept(true);
      }, 5000); // 5 second reading time
      return () => clearTimeout(timer);
    }
  }, [step, canAccept]);

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
      setErrorMsg("Token no válido");
      return;
    }

    async function loadDocument() {
      try {
        // Use the secure RPC instead of direct select
        const { data, error } = await supabase
          .rpc('get_document_for_signing', { token_uuid: token });

        if (error) throw error;

        // RPC returns an array (setof record)
        const docRecord = (data as any[])?.[0];

        if (!docRecord) throw new Error("Documento no encontrado o enlace inválido");

        if (docRecord.status !== 'sent' && docRecord.status !== 'viewed' && docRecord.status !== 'signed') {
          throw new Error("Este documento no está disponible para firma");
        }

        // Check Expiration
        if (docRecord.expires_at && new Date(docRecord.expires_at) < new Date()) {
          throw new Error("Este enlace de firma ha caducado (expiró el " + new Date(docRecord.expires_at).toLocaleDateString() + ")");
        }

        if (docRecord.status === 'sent') {
          // Attempt to update status to Viewed. 
          // Note: This might fail if RLS blocks update. 
          // Ideally we should have an RPC for this too, or rely on a "view_document" RPC.
          // For now, let's keep it silent or try.
          // If RLS blocks UPDATE, we might need another RPC 'mark_document_viewed'.
          // Let's assume for now we might fail silently or we need to add that RPC.
          // Or we can rely on `get_document_for_signing` to side-effect update? No, bad practice for GET.
          // Let's try direct update, if it fails, it's not critical for the strict flow but good for tracking.
          supabase
            .from('documents')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', docRecord.id)
            .then(({ error }) => {
              if (error) console.warn("Could not mark as viewed (RLS restriction?)", error);
            });
        }

        // Fix for Private Buckets: Transform Public URL to Signed URL if needed
        let finalFileUrl = docRecord.file_url;

        // Check if it's a Supabase URL and we are in a private bucket context
        if (docRecord.file_url && docRecord.file_url.includes('/storage/v1/object/public/documents/')) {
          try {
            // Extract path: .../documents/USER_ID/TIMESTAMP_FILE.pdf
            const pathParts = docRecord.file_url.split('/documents/');
            if (pathParts.length > 1) {
              const filePath = pathParts[1]; // "USER_ID/TIMESTAMP_FILE.pdf"

              // Generate Signed URL valid for 1 hour
              // Note: We might need RLS policy allowing 'select' on storage objects for anon? 
              // Or use an RPC for this too. 
              // Usually storage RLS is separate.
              const { data: signedData, error: signedError } = await supabase
                .storage
                .from('documents')
                .createSignedUrl(filePath, 3600);

              if (!signedError && signedData) {
                finalFileUrl = signedData.signedUrl;
                console.log("Using signed URL for private bucket access");
              } else {
                console.warn("Failed to generate signed URL, falling back to public", signedError);
              }
            }
          } catch (e) {
            console.error("Error transforming URL:", e);
          }
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
          security_level: docRecord.security_level || 'standard',
          whatsapp_verification: docRecord.whatsapp_verification, // Now coming from RPC
          issuer_data: {
            name: docRecord.issuer_company || docRecord.issuer_name || "Emisor",
            id: docRecord.issuer_tax_id,
            email: docRecord.issuer_email,
          }
        };

        setDocData(doc);
        setName(doc.signer_name || "");

        if (doc.status === 'signed') {
          setStep("complete");
        } else {
          setStep("view");
        }

      } catch (err: any) {
        console.error("Error loading document:", err);
        setStep("error");
        // Handle Supabase errors (which are not always Error instances)
        const message = err?.message || err?.error_description || (typeof err === 'string' ? err : "Error al cargar el documento");
        setErrorMsg(message);
      }
    }

    loadDocument();
  }, [token]);

  // Helper: SHA-256 for client-side (still used for prompt, but backend does verification)
  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSign = async () => {
    if (!canvasRef.current || !docData) return;

    // Check if WhatsApp verification is required (security_level or legacy flag)
    // Assuming backend returns security_level in docData (we need to fetch it)
    // If docData was updated to include security_level check:
    const requiresOtp = docData.whatsapp_verification || (docData as any).security_level === 'whatsapp_otp';

    if (requiresOtp) {
      if (!docData.signer_phone) {
        toast.error("Error: Este documento requiere verificación por WhatsApp pero no tiene número de teléfono asociado.");
        return;
      }

      const toastId = toast.loading("Enviando código de seguridad...");
      try {
        const { error } = await supabase.functions.invoke('send-otp', {
          body: { token }
        });

        if (error) {
          const body = await error.context?.json().catch(() => ({}));
          throw new Error(body.error || error.message || "Error al enviar OTP");
        }

        toast.dismiss(toastId);
        setStep("otp");
        toast.info("Código enviado a tu WhatsApp");
      } catch (err: any) {
        console.error(err);
        toast.error(err.message, { id: toastId });
      }
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

      const { data, error } = await supabase.functions.invoke('sign-complete', {
        body: {
          token,
          otp_code: otpCode || undefined,
          signature_image: signatureImage,
          user_agent: navigator.userAgent
          // ip_address: handled by backend
        }
      });

      if (error) {
        const body = await error.context?.json().catch(() => ({}));
        throw new Error(body.error || error.message || "Hubo un error al procesar la firma.");
      }

      setDocData({ ...docData, signedAt: new Date().toISOString() });
      setStep("complete");
      toast.success("Documento firmado y sellado correctamente", { id: toastId });

    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error al guardar la firma", { id: toastId });
      setStep("view"); // Go back to view so they can try again
    }
  };

  if (step === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50">
        <div className="mb-4 scale-125">
          <MulticentroLogo />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Cargando documento seguro...</span>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
        <div className="mb-12">
          <MulticentroLogo />
        </div>
        <Alert variant="destructive" className="max-w-md bg-white shadow-lg border-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="ml-2">
            <AlertTitle className="text-red-700 font-semibold text-lg">No se ha podido cargar el documento</AlertTitle>
            <AlertDescription className="mt-2 text-red-600/90 text-sm">
              {errorMsg}
            </AlertDescription>
          </div>
        </Alert>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Si el problema persiste, contacta con el remitente.</p>
          <p className="mt-2 text-xs opacity-50">ID de Referencia: {token}</p>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
        <div className="mb-8 scale-110">
          <MulticentroLogo />
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
              Certificado generado a las {new Date().toLocaleTimeString()}
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
                onClick={() => window.location.href = docData?.file_url || '#'}
                variant="outline"
                className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                <Download className="h-4 w-4" />
                Descargar copia ahora
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-sm text-muted-foreground opacity-60">
          Power by FirmaClara · Seguridad y Confianza
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="container space-y-6 px-4 py-6 max-w-5xl mx-auto">
        {/* Document info */}
        <div className="text-center space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Documento enviado para tu firma
            </p>
            {/* Only show title if it's not the generic App Name, or style it differently */}
            {docData?.title && docData.title !== 'FirmaClara' && (
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{docData.title}</h1>
            )}
            {docData?.title === 'FirmaClara' && (
              <h1 className="mt-1 text-xl font-medium tracking-tight text-muted-foreground">Documento adjunto</h1>
            )}
          </div>

          {/* Issuer Trust Card */}
          {docData?.issuer_data && (
            <div className="mx-auto max-w-lg rounded-lg border bg-slate-50/50 p-3 text-left">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Datos del Emisor (Verificado)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Razón Social:</span>
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
        </div>

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
            <Card
              ref={pdfContainerRef}
              className={`h-[500px] w-full overflow-auto transition-all ${canAccept ? 'bg-muted/10 ring-2 ring-green-200' : 'bg-muted/20'
                }`}
              onScroll={handleScroll}
            >
              <iframe
                src={docData?.file_url}
                className="w-full h-full border-none min-h-[800px]"
                title="PDF Viewer"
              />
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
          <div className="space-y-6">
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

      {/* WhatsApp OTP Verification Modal */}
      <Dialog open={step === "otp"} onOpenChange={(open) => !open && setStep("view")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Verificación de Seguridad
            </DialogTitle>
            <DialogDescription>
              Por seguridad, introduce el código de 6 dígitos que hemos enviado a tu WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
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
              <p className="text-sm text-destructive">{otpError}</p>
            )}

            <div className="flex gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  const toastId = toast.loading("Reenviando por WhatsApp...");
                  supabase.functions.invoke('send-otp', { body: { token, channel: 'whatsapp' } })
                    .then(({ error }) => {
                      if (error) throw error;
                      toast.success("Código reenviado por WhatsApp", { id: toastId });
                    })
                    .catch(e => toast.error("Error al reenviar", { id: toastId }));
                }}
              >
                Reenviar (WhatsApp)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  const toastId = toast.loading("Enviando SMS...");
                  supabase.functions.invoke('send-otp', { body: { token, channel: 'sms' } })
                    .then(({ error }) => {
                      if (error) throw error;
                      toast.success("Código enviado por SMS", { id: toastId });
                    })
                    .catch(e => toast.error("Error al enviar SMS", { id: toastId }));
                }}
              >
                Enviar por SMS
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("view")}>
              Cancelar
            </Button>
            <Button onClick={handleOtpVerify} disabled={otpCode.length !== 6}>
              Verificar y Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}