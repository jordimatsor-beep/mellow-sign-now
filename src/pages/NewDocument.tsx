import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Sparkles, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Step = "source" | "upload" | "signer" | "options" | "confirm";

export default function NewDocument() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<"upload" | "clara" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureType, setSignatureType] = useState("full");

  const [customMessage, setCustomMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error("Solo se permiten archivos PDF");
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error("Solo se permiten archivos PDF");
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    }
  };

  const handleCreateDocument = async () => {
    if (!file || !title || !signerEmail || !signerName) return;

    setIsSubmitting(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result?.toString().replace(/^data:application\/pdf;base64,/, '');

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            file: base64File,
            signer_name: signerName,
            signer_email: signerEmail,
            custom_message: customMessage,
            signature_type: signatureType,
            expires_in_days: parseInt(expiresInDays)
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear documento');
        }

        const result = await response.json();

        // Redirect to send flow or dashboard
        // Based on desired UX. Let's send it immediately?? 
        // The UI "Confirmar envío" implies we send it NOW.
        // But the endpoint we built was just POST /api/documents (Create Draft).
        // Then we have POST /api/documents/:id/send.

        // So we should chain them: Create -> Send

        if (result.document?.id) {
          await handleSendDocument(result.document.id);
        }
      };
      reader.onerror = () => {
        throw new Error('Error al leer el archivo');
      };

    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  const handleSendDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/send`, {
        method: 'POST'
      });

      if (!res.ok) {
        // If payment required (402)
        if (res.status === 402) {
          toast.error("No tienes créditos suficientes.");
          navigate('/credits/purchase'); // Redirect to buy
          return;
        }
        throw new Error('Error al enviar documento');
      }

      toast.success("Documento enviado correctamente");
      navigate('/dashboard');

    } catch (error: any) {
      toast.error("Documento creado pero falló el envío: " + error.message);
      navigate('/dashboard'); // Go to dashboard anyway, it will be in draft
    }
  };

  const renderStep = () => {
    switch (step) {
      case "source":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">¿Cómo quieres crear el documento?</h2>
            <div className="space-y-3">
              <Card
                className={`cursor-pointer transition-colors hover:bg-accent ${source === "upload" ? "ring-2 ring-primary" : ""
                  }`}
                onClick={() => setSource("upload")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Subir PDF</p>
                    <p className="text-sm text-muted-foreground">
                      Sube un documento que ya tengas preparado
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors hover:bg-accent ${source === "clara" ? "ring-2 ring-primary" : ""
                  }`}
                onClick={() => setSource("clara")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Crear con Clara</p>
                    <p className="text-sm text-muted-foreground">
                      El asistente te ayuda a redactar el documento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              className="w-full"
              disabled={!source}
              onClick={() => {
                if (source === "clara") {
                  navigate("/clara");
                } else {
                  setStep("upload");
                }
              }}
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
                Arrastra un PDF aquí o
              </p>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="secondary" size="sm" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="mt-2 text-xs text-muted-foreground">Máximo 10MB</p>
            </div>

            {file && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-auto p-1">Change</Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título del documento</Label>
              <Input
                id="title"
                placeholder="Ej: Presupuesto diseño web"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <Button className="w-full" disabled={!file || !title} onClick={() => setStep("signer")}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case "signer":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">¿Quién debe firmar?</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Juan Pérez"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: juan@email.com"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipo de firma</Label>
              <RadioGroup value={signatureType} onValueChange={setSignatureType}>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent [&:has(:checked)]:ring-2 [&:has(:checked)]:ring-primary">
                    <RadioGroupItem value="full" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Checkbox + nombre + firma</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Máxima prueba</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent [&:has(:checked)]:ring-2 [&:has(:checked)]:ring-primary">
                    <RadioGroupItem value="name" className="mt-0.5" />
                    <div>
                      <p className="font-medium">Checkbox + nombre</p>
                      <p className="text-sm text-muted-foreground">Confirmación con nombre</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              disabled={!signerName || !signerEmail}
              onClick={() => setStep("options")}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case "options":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Opciones adicionales</h2>

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

            <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
              <p>
                ⚠️ Recuerda: FirmaClara genera prueba técnica de firma. Para contratos de alto riesgo, considera firma cualificada.
              </p>
            </div>

            <Button className="w-full" onClick={() => setStep("confirm")}>
              Revisar y enviar
              <ArrowRight className="ml-2 h-4 w-4" />
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
                    <p className="text-sm text-muted-foreground">PDF, {file ? (file.size / 1024).toFixed(0) : 0} KB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firmante</span>
                <span>{signerName} ({signerEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de firma</span>
                <span>
                  {signatureType === 'full' ? 'Checkbox + nombre + firma' :
                    signatureType === 'name' ? 'Checkbox + nombre' : 'Básica'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plazo</span>
                <span>{expiresInDays} días</span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-sm">
                💳 Se usará <strong>1 crédito</strong>
              </p>
              <p className="text-xs text-muted-foreground text-opacity-50">(Se descontará al enviar)</p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateDocument}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar documento'
              )}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="container px-4 py-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === "source") {
              navigate("/dashboard");
            } else if (step === "upload") {
              setStep("source");
            } else if (step === "signer") {
              setStep("upload");
            } else if (step === "options") {
              setStep("signer");
            } else if (step === "confirm") {
              setStep("options");
            }
          }}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Nuevo documento</h1>
      </div>

      {/* Steps indicator */}
      <div className="mb-6 flex gap-1">
        {["source", "upload", "signer", "options", "confirm"].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${["source", "upload", "signer", "options", "confirm"].indexOf(step) >= i
                ? "bg-primary"
                : "bg-muted"
              }`}
          />
        ))}
      </div>

      {renderStep()}
    </div>
  );
}
