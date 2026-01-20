import { ClaraChat } from "@/components/ClaraChat";

export default function Clara() {
  return (
    <div className="container max-w-4xl py-6 h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-6">Asistente Legal Clara</h1>
      <ClaraChat />
    </div>
  );
}
