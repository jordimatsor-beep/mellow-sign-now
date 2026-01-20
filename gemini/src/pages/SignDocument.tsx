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

    fetch(`/api/sign/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al cargar documento');
        }
        return res.json();
      })
      .then((data) => {
        setDocData(data);
        setName(data.signer_name || ""); // Pre-fill name if available
        setStep("view");
      })
      .catch((err) => {
        console.error(err);
        setStep("error");
        setErrorMsg(err.message);
      });
  }, [token]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx?.beginPath();
      ctx?.moveTo(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx?.lineTo(x, y);
      ctx?.stroke();
      setHasSignature(true);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx?.beginPath();
      ctx?.moveTo(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx?.lineTo(x, y);
      ctx?.stroke();
      setHasSignature(true);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      // Re-init context properties appropriately if they get cleared? (clearRect doesn't reset state but good to be safe)
      ctx?.beginPath();
      setHasSignature(false);
    }
  };

  const handleSign = async () => {
    if (!canvasRef.current || !docData) return;

    setStep("signing");
    try {
      const signatureImage = canvasRef.current.toDataURL("image/png");

      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: name,
          signature_image: signatureImage
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al firmar');
      }

      const result = await res.json();
      setDocData({ ...docData, signedAt: result.signed_at });
      setStep("complete");
      toast.success("Documento firmado correctamente");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ocurrió un error");
      setStep("view"); // Go back to view
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
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Documento enviado por <span className="font-medium text-foreground">{docData.sender_name}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{docData.title}</h1>
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
