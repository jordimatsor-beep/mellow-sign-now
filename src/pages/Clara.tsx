import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, User, AlertTriangle, FileText, Eye, Edit, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "clara" | "user" | "assistant"; // assistant maps to clara
  content: string;
  document?: {
    title: string;
  };
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "clara",
    content:
      "¡Hola! Soy Clara, tu asistente para crear documentos. Cuéntame qué necesitas y te ayudo a redactarlo.\n\n⚠️ Recuerda: soy una herramienta de ayuda, no sustituyo a un abogado.",
  },
];

export default function Clara() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (scrollViewportRef.current) {
      // Small timeout to allow DOM update
      setTimeout(() => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsgContent = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMsgContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/clara/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'clara' ? 'assistant' : m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "clara",
        content: data.content
        // Handle document generation flag if API returns it in future
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      // Fallback error message (local)
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "clara",
        content: "Lo siento, he tenido un problema de conexión. ¿Puedes intentarlo de nuevo?"
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateDocument = () => {
    // Mock for now, or could trigger a specific API intent
    setIsTyping(true);
    setTimeout(() => {
      const documentMessage: Message = {
        id: Date.now().toString(),
        role: "clara",
        content: "He generado el contrato basándome en la información que me has dado. Revísalo antes de enviarlo.",
        document: {
          title: "Contrato autogenerado",
        },
      };
      setMessages((prev) => [...prev, documentMessage]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col md:h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold">Clara</p>
            <p className="text-xs text-muted-foreground">Asistente IA</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef} viewportRef={scrollViewportRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""
                }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "clara"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                  }`}
              >
                {message.role === "clara" ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] space-y-2 rounded-2xl px-4 py-2.5 ${message.role === "clara"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                  }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>

                {message.document && (
                  <Card className="mt-2 text-foreground">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{message.document.title}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                        <Button size="sm" className="flex-1 gap-1" asChild>
                          <Link to="/documents/new">
                            <ArrowRight className="h-3.5 w-3.5" />
                            Enviar
                          </Link>
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        ⚠️ Documento generado con IA. Revísalo.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
