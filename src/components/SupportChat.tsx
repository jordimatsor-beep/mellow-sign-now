import { useState, useEffect, useRef } from "react";
import { MessageCircleMore, X, Send, Loader2, CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
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
type RatingPhase = "stars" | "comment" | "done";

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

  // Rating flow
  const [ratingPhase, setRatingPhase] = useState<RatingPhase>("stars");
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Typing indicator
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, adminIsTyping]);

  useEffect(() => {
    if (step === "chat") setTimeout(() => inputRef.current?.focus(), 100);
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
          if (!data) { localStorage.removeItem(CHAT_STORAGE_KEY); return; }
          setChatId(parsed.chatId);
          setSubject(parsed.subject || data.subject);
          if (data.status === "closed") {
            setIsClosed(true);
            if (data.rating > 0) setRatingPhase("done");
          }
          setStep("chat");
        });
    } catch {}
  }, [user?.id]);

  // Persist chatId
  useEffect(() => {
    if (chatId && user) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatId, subject, userId: user.id }));
    }
  }, [chatId, subject, user?.id]);

  // Realtime + typing subscription
  useEffect(() => {
    if (!chatId) return;

    supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as Message[]); });

    supabase
      .from("support_chats")
      .select("status, rating")
      .eq("id", chatId)
      .single()
      .then(({ data }) => {
        if (data?.status === "closed") {
          setIsClosed(true);
          if (data.rating > 0) setRatingPhase("done");
        }
      });

    // Typing broadcast channel (admin → user)
    const typingChannel = supabase
      .channel(`support:typing:${chatId}`)
      .on("broadcast", { event: "typing" }, () => {
        setAdminIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setAdminIsTyping(false), 2500);
      })
      .subscribe();

    // Messages + chat status
    const msgChannel = supabase
      .channel(`support_chat_${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setAdminIsTyping(false);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          setMessages((prev) => {
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith("temp_") && m.sender === payload.new.sender)
            );
            if (withoutTemp.find((m) => m.id === payload.new.id)) return withoutTemp;
            if (payload.new.sender === "admin") playNotificationSound();
            return [...withoutTemp, payload.new as Message];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_chats", filter: `id=eq.${chatId}` },
        (payload) => {
          if (payload.new.status === "closed") {
            setIsClosed(true);
            localStorage.removeItem(CHAT_STORAGE_KEY);
            if (payload.new.rating > 0) setRatingPhase("done");
          }
        }
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(msgChannel);
      setIsConnected(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
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

    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, chat_id: chatId, sender: "user", content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const { data: inserted, error } = await supabase
        .from("support_messages")
        .insert({ chat_id: chatId, sender: "user", content: text })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.find((m) => m.id === inserted.id)
          ? withoutTemp
          : [...withoutTemp, inserted as Message];
      });
      await supabase
        .from("support_chats")
        .update({ admin_read: false, last_message_at: new Date().toISOString() })
        .eq("id", chatId);
    } catch {
      toast.error("Error al enviar el mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleRate = async () => {
    if (!chatId || pendingRating === 0) return;
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("support_chats")
        .update({ rating: pendingRating, rating_comment: ratingComment.trim() || null } as any)
        .eq("id", chatId);
      if (error) throw error;
      setRatingPhase("done");
      toast.success("¡Gracias por tu valoración!");
    } catch {
      toast.error("Error al guardar la valoración");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleMinimize = () => setStep("closed");

  const handleUserCloseChat = async () => {
    if (!chatId) return;
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "close_chat", chat_id: chatId },
      });
      if (error) throw error;
      setIsClosed(true);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      toast.error("Error al cerrar el chat");
    }
  };

  const handleDiscard = () => {
    setStep("closed");
    setSubject("");
    setChatId(null);
    setMessages([]);
    setInputText("");
    setIsClosed(false);
    setPendingRating(0);
    setRatingComment("");
    setRatingPhase("stars");
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const formatContent = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '"$1"');
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const hasActiveChat = chatId && step === "closed";

  return (
    <>
      {/* Floating button */}
      {step === "closed" && (
        <button
          onClick={() => (hasActiveChat ? setStep("chat") : setStep("subject"))}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
        >
          <MessageCircleMore className="h-5 w-5" />
          {hasActiveChat ? "Volver al chat" : "Soporte en vivo"}
          {hasActiveChat && <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse ml-1" />}
        </button>
      )}

      {/* Step 1: Subject */}
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
              <input
                autoFocus
                className="w-full text-sm border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                placeholder="Ej: Problema con un documento..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOpenChat()}
              />
            </div>
            <Button className="w-full" onClick={handleOpenChat} disabled={!subject.trim() || isOpening}>
              {isOpening ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</> : "Iniciar chat →"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Chat */}
      {step === "chat" && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-background shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200"
          style={{ height: "440px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full transition-colors", isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400")} />
              <div>
                <p className="font-semibold text-primary-foreground text-sm leading-tight">Soporte FirmaClara</p>
                <p className="text-primary-foreground/70 text-xs truncate max-w-[160px]">{subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isClosed && (
                <button
                  onClick={handleUserCloseChat}
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
                <div className={cn(
                  "rounded-2xl px-3 py-2 text-sm break-words",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}>
                  {formatContent(msg.content)}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {msg.sender === "admin" ? "Soporte · " : ""}
                  {msg.id.startsWith("temp_") ? "Enviando..." : formatTime(msg.created_at)}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {adminIsTyping && !isClosed && (
              <div className="flex flex-col items-start gap-0.5 animate-in fade-in duration-200">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center h-3">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground px-1">Soporte está escribiendo</span>
              </div>
            )}

            {/* Rating block */}
            {isClosed && (
              <div className="mt-3 p-4 bg-muted/40 rounded-xl border border-border/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {ratingPhase === "stars" && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-center">¿Cómo valoras nuestro soporte?</p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => { setPendingRating(star); setRatingPhase("comment"); }}
                          className="transition-all hover:scale-125 active:scale-95 text-muted-foreground/30 hover:text-yellow-400 focus:outline-none"
                        >
                          <Star className="h-7 w-7" fill="none" strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ratingPhase === "comment" && (
                  <div className="flex flex-col gap-3">
                    {/* Selected stars preview */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setPendingRating(star)}
                            className="transition-all hover:scale-110"
                          >
                            <Star
                              className={cn("h-5 w-5", pendingRating >= star ? "text-yellow-400" : "text-muted-foreground/20")}
                              fill={pendingRating >= star ? "currentColor" : "none"}
                              strokeWidth={1.5}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                      rows={3}
                      placeholder="Comentario opcional..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPendingRating(0); setRatingPhase("stars"); }}
                        className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Cambiar
                      </button>
                      <Button
                        size="sm"
                        onClick={handleRate}
                        disabled={isSubmittingRating}
                        className="flex-1 text-xs h-8"
                      >
                        {isSubmittingRating
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : "Enviar valoración"}
                      </Button>
                    </div>
                  </div>
                )}

                {ratingPhase === "done" && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> ¡Gracias por tu feedback!
                    </p>
                    <button
                      onClick={handleDiscard}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isSending}
                className="h-9 w-9 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
