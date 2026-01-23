import { ClaraChat } from "@/components/ClaraChat";

export default function Clara() {
  return (
    <div className="container max-w-4xl py-6 h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Asistente Inteligente Clara</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ayudo a redactar presupuestos, correos formales y contratos.
        </p>
      </div>
      <ClaraChat />
    </div>
  );
}
