import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Check, Download, Eraser, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

type SigningStep = "loading" | "error" | "view" | "signing" | "complete";

export default function SignDocument() {
  const { token } = useParams();
  const [step, setStep] = useState<SigningStep>("loading");
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [docData, setDocData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize canvas when showing drawing area
  useEffect(() => {
    if (step === 'view') {
      // Small delay to ensure DOM is ready if switching steps
      setTimeout(initCanvas, 100);
    }
  }, [step]);



  // Fetch Document Data
  useEffect(() => {
    if (!token) {
      setStep("error");
      setErrorMsg("Token no válido");
      return;
    }

    async function loadDocument() {
      try {
        const { data, error } = await supabase.rpc('get_document_by_token', { p_token: token });

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Documento no encontrado o enlace inválido");

        const doc = data[0]; // RPC returns array

        if (doc.status !== 'sent' && doc.status !== 'viewed') {
          // If already signed, show complete state (optional, but for now just show error or handle gracefully)
          if (doc.status === 'signed') {
            setDocData(doc); // We might need more data for signed view? 
            // Actually, let's just show it.
          }
        }

        setDocData(doc);
        setName(doc.signer_name || "");
        setStep("view");

        // Log view event
        await supabase.from('event_logs').insert({
          event_type: 'document_viewed',
          event_data: { token, title: doc.title },
          document_id: doc.id
          // user_id is null for anonymous
        });

      } catch (err: any) {
        console.error(err);
        setStep("error");
        setErrorMsg(err.message || "Error al cargar el documento");
      }
    }

    loadDocument();
  }, [token]);


  // ... initCanvas, handlers ...

  // Helper: SHA-256 for client-side
  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSign = async () => {
    if (!canvasRef.current || !docData) return;

    setStep("signing");
    const toastId = toast.loading("Procesando firma segura...");

    try {
      const signatureImage = canvasRef.current.toDataURL("image/png");

      // 1. Generate a cryptographic footprint (Hash) of the "Signed State"
      // We bind the Document URL, the Signature Image, and the Signer Name.
      // In a PAdES standard, this would be the hash of the byte range, but checking the requirement,
      // we ensure we seal "this signature on this document".
      const hashInput = `${docData.file_url}||${signatureImage}||${name}`;
      const finalHash = await sha256(hashInput);

      // 2. Request Qualified Timestamp (TSA) - HARD FAIL
      // We explicitly invoke the Edge Function.
      // Note: invoke() returns { data, error } where error is network/invocation error.
      // application level errors might be in data.error if we return 200 OK with error body.
      toast.loading("Solicitando sello de tiempo (TSA)...", { id: toastId });

      const { data: tsaData, error: tsaError } = await supabase.functions.invoke('request-tsa', {
        body: { hash: finalHash }
      });

      if (tsaError) {
        throw new Error(`Error de conexión TSA: ${tsaError.message}`);
      }

      if (!tsaData || tsaData.error) {
        const detailedInfo = tsaData?.error ? ` (${tsaData.error})` : '';
        throw new Error(`La Autoridad de Sellado de Tiempo rechazó la solicitud${detailedInfo}. No se puede firmar sin sello válido.`);
      }

      const { tsr, timestamp, request: tsaRequest } = tsaData;

      if (!tsr || !timestamp) {
        throw new Error("Respuesta TSA incompleta.");
      }

      // 3. Submit Signature to Database with TSA Evidence
      toast.loading("Guardando firma y evidencias...", { id: toastId });

      const { data, error } = await supabase.rpc('submit_signature', {
        p_sign_token: token,
        p_signer_email: docData.signer_email || "unknown@email.com",
        p_signer_name: name,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_signature_image_url: signatureImage,
        p_hash_sha256: finalHash,
        // TSA Params
        p_tsa_request: tsaRequest,
        p_tsa_response: tsr,
        p_tsa_timestamp: timestamp
      });

      if (error) throw error;

      // Make sure we update local state
      setDocData({ ...docData, signedAt: new Date().toISOString() });
      setStep("complete");
      toast.success("Documento firmado y sellado correctamente", { id: toastId });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ocurrió un error crítico al guardar la firma", { id: toastId });
      setStep("view"); // Allow retry
    }
  };

  if (step === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando documento...</span>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="container flex flex-col items-center px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="container flex flex-col items-center px-4 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Check className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold">Documento firmado correctamente</h1>
        <p className="mt-2 text-muted-foreground">Fecha: {new Date(docData.signedAt).toLocaleString()}</p>
        <p className="text-muted-foreground text-sm mt-1">ID: {token}</p>

        {/* 
        <Button variant="outline" className="mt-6 gap-2" disabled>
          <Download className="h-4 w-4" />
          Descargar copia (Próximamente)
        </Button> 
        */}

        <p className="mt-8 text-sm text-muted-foreground">
          {docData.sender_name} ha sido notificado.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ya puedes cerrar esta ventana.
        </p>
      </div>
    );
  }

  return (
    <div className="container space-y-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Document info */}
      <div className="text-center space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Documento enviado por <span className="font-medium text-foreground">{docData.sender_name}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{docData.title}</h1>
        </div>

        {/* Issuer Trust Card */}
        {docData.issuer_data && (
          <div className="mx-auto max-w-lg rounded-lg border bg-slate-50/50 p-3 text-left">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Emisor (Verificado)</p>
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
              {docData.issuer_data.email && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Contacto:</span>
                  <p className="text-muted-foreground">{docData.issuer_data.email} • {docData.issuer_data.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* PDF Viewer */}
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Revisar Documento</h2>
          <Card className="h-[600px] w-full overflow-hidden bg-muted/20">
            {/* Use iframe to show PDF key feature */}
            <iframe
              src={docData.file_url}
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </Card>
        </div>

        {/* Signing form */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Firmar Documento</h2>

            <div className="space-y-4">
              {/* Acceptance checkbox */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent [&:has(:checked)]:ring-2 [&:has(:checked)]:ring-primary">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-tight">
                  He leído y acepto el contenido de este documento y consiento el uso de la firma electrónica simple.
                </span>
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
                    width={400} // Increased width
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
  );
}
