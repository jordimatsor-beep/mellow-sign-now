import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Sparkles, FileText, ArrowRight, Loader2, User, Lock, Unlock, Receipt, Wrench, FileSignature, ClipboardList, MapPin } from "lucide-react";
import { ContactSelector } from "@/components/contacts/ContactSelector";
import { useProfile } from "@/context/ProfileContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

type Step = "source" | "doctype" | "upload" | "signer" | "options" | "confirm";
type DocType = "presupuesto" | "parte" | "contrato" | "otro";

export default function NewDocument() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<"upload" | "clara" | null>(null);
  const [docType, setDocType] = useState<DocType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [file, setFile] = useState<File | null>(null);
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

  // Signature position settings
  const [signaturePosition, setSignaturePosition] = useState<"new_page" | "last_page" | "custom">("new_page");
  const [signaturePage, setSignaturePage] = useState(0);
  const [signatureX, setSignatureX] = useState(0);
  const [signatureY, setSignatureY] = useState(0);
  const [signaturePreset, setSignaturePreset] = useState<string>("bottom-center");

  // Fields are optional for "presupuesto" type
  const isPresupuesto = docType === "presupuesto";

  const handleContactSelect = (contact: any) => {
    setSignerName(contact.name);
    setSignerEmail(contact.email);
    if (contact.phone) setSignerPhone(contact.phone);
    if (contact.nif) setSignerNif(contact.nif);
    if (contact.address) setSignerAddress(contact.address);
    toast.success("Datos importados de la agenda");
  };

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

  const handleWhatsappToggle = (checked: boolean) => {
    setWhatsappVerification(checked);
    setSecurityLevel(checked ? "whatsapp_otp" : "standard");
  };

  // Signature position presets (based on A4: 595 x 841 points)
  const handleSignaturePreset = (preset: string) => {
    setSignaturePreset(preset);
    // Standard A4 dimensions: 595.28 x 841.89 points
    // Signature area: ~200x100 points
    switch (preset) {
      case "bottom-left":
        setSignatureX(50);
        setSignatureY(80);
        break;
      case "bottom-center":
        setSignatureX(200); // Centered for ~200px signature
        setSignatureY(80);
        break;
      case "bottom-right":
        setSignatureX(350);
        setSignatureY(80);
        break;
      case "center":
        setSignatureX(200);
        setSignatureY(400);
        break;
      default:
        setSignatureX(200);
        setSignatureY(80);
    }
  };

  const handleCreateDocument = async () => {
    if (!file || !title || !signerEmail || !signerName) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás autenticado");

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      const fileUrl = publicUrlData.publicUrl;

      const { data: doc, error: insertError } = await supabase
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
          // Signature position settings
          signature_page: signaturePage,
          signature_x: signatureX,
          signature_y: signatureY
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (doc?.id) {
        await handleSendDocument(doc.id, user.id, doc.sign_token);
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  const handleSendDocument = async (docId: string, userId: string, signToken: string) => {
    try {
      const { data: creditResult, error: creditError } = await supabase.rpc('consume_credit', { amount: 1 });

      if (creditError) throw creditError;

      const resultRow = (creditResult as any)?.[0];

      if (!resultRow || !resultRow.success) {
        toast.error("No tienes créditos suficientes.");
        navigate('/credits/purchase');
        return;
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (updateError) throw updateError;

      const { error: fnError } = await supabase.functions.invoke('send-document-invitation', {
        body: {
          document_id: docId,
          signer_email: signerEmail,
          signer_name: signerName,
          sign_token: signToken,
          sender_name: profile?.name || profile?.email || 'Usuario',
          title: title
        }
      });

      if (fnError) {
        console.error("Error sending email:", fnError);
        toast.warning("Documento creado pero hubo un error al enviar el email.");
      }

      await supabase.from('event_logs').insert({
        user_id: userId,
        document_id: docId,
        event_type: 'document.sent',
        event_data: { credits_remaining: resultRow.remaining }
      });

      toast.success("Documento enviado correctamente");
      navigate('/dashboard');

    } catch (error: any) {
      toast.error("Error al enviar: " + error.message);
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
      case "source":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">¿Cómo quieres crear el documento?</h2>
            <div className="space-y-3">
              <div
                className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all hover:bg-slate-50 hover:border-primary/50 hover:shadow-sm ${source === "upload" ? "ring-2 ring-primary border-transparent" : "bg-white"
                  }`}
                onClick={() => setSource("upload")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Subir PDF</p>
                  <p className="text-sm text-muted-foreground">
                    Sube un documento que ya tengas preparado
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all hover:bg-slate-50 hover:border-primary/50 hover:shadow-sm ${source === "clara" ? "ring-2 ring-primary border-transparent" : "bg-white"
                  }`}
                onClick={() => setSource("clara")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Crear con Clara</p>
                  <p className="text-sm text-muted-foreground">
                    El asistente te ayuda a redactar el documento
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!source}
              onClick={() => {
                if (source === "clara") {
                  navigate("/clara");
                } else {
                  setStep("doctype");
                }
              }}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

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
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="h-auto p-1">Cambiar</Button>
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

            <Button className="w-full" disabled={!file || !title} onClick={() => setStep("signer")}>
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
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: juan@email.com"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
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
                          <SelectItem value="+34">🇪🇸 +34</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33</SelectItem>
                          <SelectItem value="+351">🇵🇹 +351</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                          <SelectItem value="+49">🇩🇪 +49</SelectItem>
                          <SelectItem value="+39">🇮🇹 +39</SelectItem>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+52">🇲🇽 +52</SelectItem>
                          <SelectItem value="+54">🇦🇷 +54</SelectItem>
                          <SelectItem value="+56">🇨🇱 +56</SelectItem>
                          <SelectItem value="+57">🇨🇴 +57</SelectItem>
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

            {/* Signature Position Selector */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Posición de la firma
              </Label>

              <RadioGroup
                value={signaturePosition}
                onValueChange={(value: "new_page" | "last_page" | "custom") => {
                  setSignaturePosition(value);
                  if (value === "new_page") {
                    setSignaturePage(0);
                    setSignatureX(0);
                    setSignatureY(0);
                  } else if (value === "last_page") {
                    setSignaturePage(-1); // -1 = última página
                    handleSignaturePreset(signaturePreset);
                  }
                }}
                className="space-y-2"
              >
                <div className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${signaturePosition === "new_page" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <RadioGroupItem value="new_page" id="pos-new" />
                  <Label htmlFor="pos-new" className="cursor-pointer flex-1">
                    <span className="font-medium">Página nueva (recomendado)</span>
                    <p className="text-xs text-muted-foreground">Añade una página al final con la firma y certificado</p>
                  </Label>
                </div>

                <div className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${signaturePosition === "last_page" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <RadioGroupItem value="last_page" id="pos-last" />
                  <Label htmlFor="pos-last" className="cursor-pointer flex-1">
                    <span className="font-medium">Última página del documento</span>
                    <p className="text-xs text-muted-foreground">Coloca la firma en una posición específica</p>
                  </Label>
                </div>

                <div className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${signaturePosition === "custom" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <RadioGroupItem value="custom" id="pos-custom" />
                  <Label htmlFor="pos-custom" className="cursor-pointer flex-1">
                    <span className="font-medium">Página específica</span>
                    <p className="text-xs text-muted-foreground">Elige página y coordenadas exactas</p>
                  </Label>
                </div>
              </RadioGroup>

              {/* Position presets for last_page */}
              {signaturePosition === "last_page" && (
                <div className="ml-6 p-3 rounded-lg bg-muted/30 space-y-3">
                  <Label className="text-sm">Posición en la página:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "bottom-left", label: "Abajo izq." },
                      { value: "bottom-center", label: "Abajo centro" },
                      { value: "bottom-right", label: "Abajo der." },
                    ].map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant={signaturePreset === preset.value ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSignaturePreset(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom position inputs */}
              {signaturePosition === "custom" && (
                <div className="ml-6 p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Página</Label>
                      <Input
                        type="number"
                        min="1"
                        value={signaturePage || 1}
                        onChange={(e) => setSignaturePage(parseInt(e.target.value) || 1)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">X (0-595)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="595"
                        value={signatureX}
                        onChange={(e) => setSignatureX(parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y (0-841)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="841"
                        value={signatureY}
                        onChange={(e) => setSignatureY(parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Coordenadas en puntos PDF (A4 = 595x841). Y=0 es la parte inferior.
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
            >
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
                    <p className="text-sm text-muted-foreground">
                      {docTypes.find(d => d.value === docType)?.label || "Documento"} • {file ? (file.size / 1024).toFixed(0) : 0} KB
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
                  {signaturePosition === "last_page" && `Última pág. (${signaturePreset})`}
                  {signaturePosition === "custom" && `Pág. ${signaturePage} (${signatureX}, ${signatureY})`}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-sm">
                💳 Se usará <strong>1 crédito</strong>
              </p>
              <p className="text-xs text-muted-foreground">(Se descontará al enviar)</p>
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

  const getSteps = () => {
    if (source === "upload") {
      return ["source", "doctype", "upload", "signer", "options", "confirm"];
    }
    return ["source", "doctype", "upload", "signer", "options", "confirm"];
  };

  const steps = getSteps();

  return (
    <div className="mx-auto max-w-xl py-4 space-y-6">
      <div className="flex items-center gap-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const currentIndex = steps.indexOf(step);
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

      <div className="mx-1 flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${steps.indexOf(step) >= i
              ? "bg-primary"
              : "bg-slate-200"
              }`}
          />
        ))}
      </div>

      <Card className="border-muted/40 shadow-lg">
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      <ContactSelector
        isOpen={isContactSelectorOpen}
        onClose={() => setIsContactSelectorOpen(false)}
        onSelect={handleContactSelect}
      />
    </div>
  );
}
