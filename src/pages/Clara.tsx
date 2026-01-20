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

import { supabase } from "@/lib/supabase";

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
      // Usar Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('clara-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'clara' ? 'assistant' : m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

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
    <div className="flex h-[calc(100vh-8rem)] flex-col bg-slate-50/50">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollRef} viewportRef={scrollViewportRef}>
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm mt-1 ${message.role === "clara"
                    ? "bg-white text-primary border border-slate-100"
                    : "bg-blue-600 text-white"
                    }`}
                >
                  {message.role === "clara" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`space-y-2 px-5 py-3 shadow-sm ${message.role === "clara"
                    ? "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100"
                    : "bg-blue-600 text-white rounded-2xl rounded-tr-none"
                    }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>

                  {message.document && (
                    <Card className="mt-3 text-foreground border-0 shadow-sm overflow-hidden bg-slate-50">
                      <div className="flex items-center gap-3 p-3 bg-white border-b border-slate-100">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-slate-900">{message.document.title}</p>
                          <p className="text-xs text-muted-foreground">Documento generado</p>
                        </div>
                      </div>
                      <div className="flex bg-slate-50 p-2 gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs font-medium hover:bg-slate-200">
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Vista previa
                        </Button>
                        <Button size="sm" className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-none" asChild>
                          <Link to="/documents/new">
                            Enviar ahora
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex w-full justify-start">
              <div className="flex max-w-[85%] gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary border border-slate-100 shadow-sm mt-1">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-100 px-5 py-4 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje a Clara..."
            className="flex-1 rounded-full border-slate-200 bg-slate-50 px-6 py-6 shadow-sm focus-visible:ring-blue-600"
            disabled={isTyping}
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
            disabled={!input.trim() || isTyping}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
