import { Bot } from "lucide-react";
import { ClaraChat } from "@/components/ClaraChat";

export default function Clara() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Asistente Inteligente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Redacta presupuestos, contratos y comunicaciones formales en segundos.
        </p>
        {/* Transparencia obligatoria — EU AI Act Art. 52 (Reglamento IA UE 2024/1689) */}
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
          <Bot className="h-3.5 w-3.5 shrink-0" />
          Sistema de inteligencia artificial (Google Gemini). Sus respuestas pueden contener errores — revisa siempre los documentos antes de firmarlos.
        </div>
      </div>
      <ClaraChat />
    </div>
  );
}
