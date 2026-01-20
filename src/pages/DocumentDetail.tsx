import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, FileText, User, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, DocumentStatus } from "@/components/shared/StatusBadge";
import { Separator } from "@/components/ui/separator";

// Mock data
const mockDocument = {
  id: "1",
  title: "Presupuesto diseño web",
  signerName: "Juan Pérez",
  signerEmail: "juan@email.com",
  status: "signed" as DocumentStatus,
  signedAt: "20/01/2025 a las 14:32",
  timeline: [
    { date: "20/01/2025 14:32", event: "Firmado", completed: true },
    { date: "20/01/2025 14:30", event: "Visto por firmante", completed: true },
    { date: "20/01/2025 10:00", event: "Enviado", completed: true },
    { date: "20/01/2025 09:55", event: "Creado", completed: true },
  ],
};

export default function DocumentDetail() {
  const { id } = useParams();

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
            <h2 className="text-xl font-semibold">{mockDocument.title}</h2>
          </div>
        </div>

        {/* Status card */}
        <Card className="bg-success/5 border-success/20">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-3 text-lg font-semibold text-success">FIRMADO</p>
            <p className="text-sm text-muted-foreground">{mockDocument.signedAt}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Signer info */}
      <div className="space-y-3">
        <h3 className="font-medium">Firmante</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{mockDocument.signerName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{mockDocument.signerEmail}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-3">
        <h3 className="font-medium">Cronología</h3>
        <div className="space-y-3">
          {mockDocument.timeline.map((item, index) => (
            <div key={index} className="flex gap-3">
              <div className="relative flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    index === 0
                      ? "bg-success"
                      : "border-2 border-muted-foreground/30 bg-background"
                  }`}
                />
                {index < mockDocument.timeline.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-medium ${index === 0 ? "text-success" : ""}`}>
                  {item.event}
                </p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Download className="h-4 w-4" />
          Descargar PDF firmado
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2">
          <FileText className="h-4 w-4" />
          Descargar certificado de evidencias
        </Button>
      </div>
    </div>
  );
}
