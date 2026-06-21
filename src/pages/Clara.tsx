import { ClaraChat } from "@/components/ClaraChat";

export default function Clara() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Asistente Inteligente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Redacta presupuestos, contratos y comunicaciones formales en segundos.
        </p>
      </div>
      <ClaraChat />
    </div>
  );
}
