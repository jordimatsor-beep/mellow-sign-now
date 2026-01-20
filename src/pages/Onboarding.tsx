import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Shield, Gift, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

type Step = 1 | 2 | 3;

export default function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const handleComplete = () => {
    // In a real app, save onboarding completion to backend
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Progress */}
      <div className="flex gap-1 p-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              step >= s ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8">
        {step === 1 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            {/* Logo animation placeholder */}
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary">
              <span className="text-4xl font-bold text-primary-foreground">F</span>
            </div>

            <h1 className="text-2xl font-bold">Bienvenido a FirmaClara</h1>
            <p className="mt-3 max-w-sm text-muted-foreground">
              Envía documentos y que tus clientes los firmen en menos de un minuto.
              Con prueba técnica verificable.
            </p>

            <Button className="mt-8 w-full max-w-xs" onClick={() => setStep(2)}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col">
            <Button
              variant="ghost"
              className="mb-4 w-fit gap-2"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>

            <h1 className="text-xl font-bold">¿Qué validez tiene?</h1>

            <Card className="mt-4">
              <CardContent className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">
                  FirmaClara genera <strong className="text-foreground">firma electrónica simple</strong> con
                  certificado de evidencias.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span className="text-sm">Válida legalmente (eIDAS)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span className="text-sm">Prueba técnica verificable</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span className="text-sm">Suficiente para contratos comerciales del día a día</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                  <span className="text-sm text-warning">
                    No equivale a firma notarial ni firma cualificada
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="link"
              className="mt-2 self-start text-sm"
            >
              ▼ Ver más detalles
            </Button>

            <div className="mt-auto">
              <Button className="w-full" onClick={() => setStep(3)}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col">
            <Button
              variant="ghost"
              className="mb-4 w-fit gap-2"
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>

            <h1 className="text-xl font-bold">Casi listo</h1>

            <Card className="mt-4">
              <CardContent className="p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={(checked) => setAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground">
                    Declaro que he leído y entiendo que FirmaClara proporciona firma
                    electrónica simple con certificación técnica de evidencias, que
                    tiene validez legal para acuerdos comerciales ordinarios...{" "}
                    <button className="text-primary underline">leer completo</button>
                  </span>
                </label>
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center gap-3 rounded-lg bg-success/10 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success">
                <Gift className="h-5 w-5 text-success-foreground" />
              </div>
              <div>
                <p className="font-semibold text-success">🎁 ¡Regalo de bienvenida!</p>
                <p className="text-sm text-muted-foreground">
                  Tienes 2 envíos de prueba gratis
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                className="w-full"
                disabled={!accepted}
                onClick={handleComplete}
              >
                Empezar a usar FirmaClara
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
