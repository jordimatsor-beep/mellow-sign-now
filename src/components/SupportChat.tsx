import { useState, useEffect, useRef } from "react";
import { MessageCircleMore, X, Send, Loader2, CheckCircle, Star, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { playNotificationSound } from "@/lib/audio";

interface Message {
  id: string;
  chat_id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
}

type Step = "closed" | "subject" | "chat";

const CHAT_STORAGE_KEY = "firmaclara_live_chat";

export function SupportChat() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [step, setStep] = useState<Step>("closed");
  const [subject, setSubject] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.userId !== user.id || !parsed.chatId) return;
      supabase
        .from("support_chats")
        .select("status, subject, rating")
        .eq("id", parsed.chatId)
        .single()
        .then(({ data }) => {
          if (!data) {
            localStorage.removeItem(CHAT_STORAGE_KEY);
            return;
          }
          setChatId(parsed.chatId);
          setSubject(parsed.subject || data.subject);
          if (data.status === "closed") {
            setIsClosed(true);
            setRating(data.rating || 0);
          }
          setStep("chat");
        });
    } catch {}
  }, [user?.id]);

  // Save session when chatId is set
  useEffect(() => {
    if (chatId && user) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatId, subject, userId: user.id }));
    }
  }, [chatId, subject, user?.id]);

  // Subscribe to real-time messages when chatId is set
  useEffect(() => {
    if (!chatId) return;

    supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    supabase
      .from("support_chats")
      .select("status, rating")
      .eq("id", chatId)
      .single()
      .then(({ data }) => {
        if (data?.status === "closed") {
          setIsClosed(true);
          setRating(data.rating || 0);
        }
      });

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
            // Remove any temp message when real message arrives from same sender
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith("temp_") && m.sender === payload.new.sender)
            );
            const exists = withoutTemp.find((m) => m.id === payload.new.id);
            if (exists) return withoutTemp;
            if (payload.new.sender === "admin") playNotificationSound();
            return [...withoutTemp, payload.new as Message];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_chats",
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.new.status === "closed") {
            setIsClosed(true);
            setRating(payload.new.rating || 0);
            localStorage.removeItem(CHAT_STORAGE_KEY);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
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

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_id: chatId,
      sender: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data: inserted, error } = await supabase
        .from("support_messages")
        .insert({ chat_id: chatId, sender: "user", content: text })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic with real (in case realtime hasn't fired yet)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const alreadyHere = withoutTemp.find((m) => m.id === inserted.id);
        return alreadyHere ? withoutTemp : [...withoutTemp, inserted as Message];
      });

      await supabase
        .from("support_chats")
        .update({ admin_read: false, last_message_at: new Date().toISOString() })
        .eq("id", chatId);
    } catch (e: any) {
      toast.error("Error al enviar el mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  // Minimize the widget - keeps the chat session alive
  const handleMinimize = () => {
    setStep("closed");
  };

  const handleUserCloseChat = async () => {
    if (!chatId) return;
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "close_chat", chat_id: chatId },
      });
      if (error) throw error;
      toast.success("Chat cerrado correctamente");
      setIsClosed(true);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e: any) {
      toast.error("Error al cerrar el chat");
    }
  };

  // Fully discard the chat widget state (used after rating or when closed)
  const handleDiscard = () => {
    setStep("closed");
    setSubject("");
    setChatId(null);
    setMessages([]);
    setInputText("");
    setIsClosed(false);
    setRating(0);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleRate = async (value: number) => {
    if (!chatId || rating > 0) return;
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("support_chats")
        .update({ rating: value })
        .eq("id", chatId);
      if (error) throw error;
      setRating(value);
      toast.success("¡Gracias por tu valoración!");
    } catch (e: any) {
      toast.error("Error al guardar la valoración");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // If widget is minimized but there's an active chat, show a badge on the button
  const hasActiveChat = chatId && step === "closed";

  return (
    <>
      {/* Floating trigger button */}
      {step === "closed" && (
        <button
          onClick={() => (hasActiveChat ? setStep("chat") : setStep("subject"))}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
        >
          <MessageCircleMore className="h-5 w-5" />
          {hasActiveChat ? "Volver al chat" : "Soporte en vivo"}
          {hasActiveChat && (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse ml-1" />
          )}
        </button>
      )}

      {/* Step 1: Subject input */}
      {step === "subject" && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold text-primary-foreground text-sm">Soporte FirmaClara</span>
            </div>
            <button onClick={handleMinimize} className="text-primary-foreground/70 hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Hola{profile?.name ? `, ${profile.name.split(" ")[0]}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}! ¿En qué podemos ayudarte hoy?
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
        <div
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-background shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200"
          style={{ height: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div
                title={isConnected ? "Conectado" : "Conectando..."}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"
                )}
              />
              <div>
                <p className="font-semibold text-primary-foreground text-sm leading-tight">Soporte FirmaClara</p>
                <p className="text-primary-foreground/70 text-xs truncate max-w-[160px]">{subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isClosed && (
                <button
                  onClick={handleUserCloseChat}
                  title="Cerrar chat"
                  className="text-primary-foreground/50 hover:text-primary-foreground/80 text-[10px] px-1.5 py-0.5 rounded hover:bg-primary-foreground/10 transition-colors"
                >
                  Cerrar
                </button>
              )}
              <button onClick={handleMinimize} className="text-primary-foreground/70 hover:text-primary-foreground ml-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] gap-0.5",
                  msg.sender === "user" ? "ml-auto items-end" : "items-start",
                  msg.id.startsWith("temp_") && "opacity-60"
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
                  {msg.sender === "admin" ? "Soporte · " : ""}
                  {msg.id.startsWith("temp_") ? "Enviando..." : formatTime(msg.created_at)}
                </span>
              </div>
            ))}

            {isClosed && (
              <div className="mt-4 flex flex-col items-center justify-center p-4 bg-muted/50 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                <p className="text-sm font-medium mb-3">¿Cómo calificarías nuestro soporte?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      disabled={rating > 0 || isSubmittingRating}
                      className={cn(
                        "transition-all hover:scale-110 active:scale-95 disabled:hover:scale-100",
                        rating >= star
                          ? "text-yellow-400 drop-shadow-sm"
                          : "text-muted-foreground/30 hover:text-yellow-400/50"
                      )}
                    >
                      <Star className="h-7 w-7" fill={rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <div className="flex flex-col items-center gap-2 mt-3">
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> ¡Gracias por tu feedback!
                    </p>
                    <button
                      onClick={handleDiscard}
                      className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Cerrar ventana
                    </button>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {!isClosed && (
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
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isSending}
                className="h-9 w-9 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
