import { useState, useEffect, useRef } from "react";
import { MessageCircleMore, X, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  chat_id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
}

type Step = "closed" | "subject" | "chat";

export function SupportChat() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("closed");
  const [subject, setSubject] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (step === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Subscribe to real-time messages when chatId is set
  useEffect(() => {
    if (!chatId) return;

    // Load existing messages
    supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    // Real-time subscription
    const channel = supabase
      .channel(`support_chat_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const handleOpenChat = async () => {
    if (!subject.trim()) return;
    setIsOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-support", {
        body: { action: "open_chat", subject: subject.trim() },
      });
      if (error) throw error;
      setChatId(data.chat_id);
      setStep("chat");
    } catch (e: any) {
      toast.error("No se pudo abrir el chat: " + e.message);
    } finally {
      setIsOpening(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !chatId || isSending) return;
    const text = inputText.trim();
    setInputText("");
    setIsSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        chat_id: chatId,
        sender: "user",
        content: text,
      });
      if (error) throw error;

      // Update last_message_at
      await supabase
        .from("support_chats")
        .update({ admin_read: false, last_message_at: new Date().toISOString() })
        .eq("id", chatId);
    } catch (e: any) {
      toast.error("Error al enviar el mensaje");
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep("closed");
    setSubject("");
    setChatId(null);
    setMessages([]);
    setInputText("");
    setIsClosed(false);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Floating trigger button */}
      {step === "closed" && (
        <button
          onClick={() => setStep("subject")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
        >
          <MessageCircleMore className="h-5 w-5" />
          Soporte en vivo
        </button>
      )}

      {/* Step 1: Subject input */}
      {step === "subject" && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold text-primary-foreground text-sm">Soporte FirmaClara</span>
            </div>
            <button onClick={handleClose} className="text-primary-foreground/70 hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Hola{user?.email ? `, ${user.email.split("@")[0]}` : ""}! ¿En qué podemos ayudarte hoy?
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto del chat</label>
              <Input
                autoFocus
                placeholder="Ej: Problema con un documento..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOpenChat()}
                className="text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleOpenChat}
              disabled={!subject.trim() || isOpening}
            >
              {isOpening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando chat...
                </>
              ) : (
                "Iniciar chat →"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Live chat window */}
      {step === "chat" && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-background shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200"
          style={{ height: "420px" }}>

          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="font-semibold text-primary-foreground text-sm leading-tight">Soporte FirmaClara</p>
                <p className="text-primary-foreground/70 text-xs">{subject}</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-primary-foreground/70 hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] gap-0.5",
                  msg.sender === "user" ? "ml-auto items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm break-words",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {msg.sender === "admin" ? "Soporte · " : ""}{formatTime(msg.created_at)}
                </span>
              </div>
            ))}

            {isClosed && (
              <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                Chat cerrado
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t flex-shrink-0">
            <input
              ref={inputRef}
              className="flex-1 text-sm bg-muted rounded-full px-4 py-2 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              placeholder="Escribe tu mensaje..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending || isClosed}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending || isClosed}
              className="h-9 w-9 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
