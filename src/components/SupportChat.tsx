import { useState, useEffect, useRef, useMemo, useCallback, Fragment, forwardRef, useImperativeHandle } from "react";
import { MessageCircleMore, X, Send, Loader2, CheckCircle, Star, ShieldCheck } from "lucide-react";
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

export interface SupportChatHandle {
  open: () => void;
}

interface SupportChatProps {
  hideTriggerButton?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function stripMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '"$1"');
}

interface ProcessedMessage {
  msg: Message;
  isFirst: boolean;
  isLast: boolean;
  showDaySep: boolean;
  dayLabel: string;
}

function processMessages(messages: Message[]): ProcessedMessage[] {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isFirst = !prev || prev.sender !== msg.sender;
    const isLast = !next || next.sender !== msg.sender;
    const showDaySep =
      i === 0 ||
      new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
    return { msg, isFirst, isLast, showDaySep, dayLabel: getDayLabel(msg.created_at) };
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export const SupportChat = forwardRef<SupportChatHandle, SupportChatProps>(
  function SupportChat({ hideTriggerButton = false }, ref) {
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
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Rating
    const [ratingPhase, setRatingPhase] = useState<RatingPhase>("stars");
    const [pendingRating, setPendingRating] = useState(0);
    const [ratingComment, setRatingComment] = useState("");
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    // Typing
    const [adminIsTyping, setAdminIsTyping] = useState(false);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const firstName = profile?.name
      ? profile.name.split(" ")[0]
      : user?.email
      ? user.email.split("@")[0]
      : null;

    // ── Imperative handle for external open() calls ──
    useImperativeHandle(ref, () => ({
      open: () => {
        if (chatId) setStep("chat");
        else setStep("subject");
      },
    }));

    // ── Processed messages with grouping ──
    const processed = useMemo(() => processMessages(messages), [messages]);

    // ── Scroll ──
    const scrollToBottom = useCallback(() => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, adminIsTyping, scrollToBottom]);

    useEffect(() => {
      if (step === "chat") {
        setTimeout(() => inputRef.current?.focus(), 100);
        setUnreadCount(0);
      }
    }, [step]);

    // ── Restore session ──
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
              if ((data.rating ?? 0) > 0) setRatingPhase("done");
            }
            setStep("chat");
          });
      } catch {}
    }, [user?.id]);

    // ── Persist chatId ──
    useEffect(() => {
      if (chatId && user)
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chatId, subject, userId: user.id }));
    }, [chatId, subject, user?.id]);

    // ── Realtime subscriptions ──
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
            if ((data.rating ?? 0) > 0) setRatingPhase("done");
          }
        });

      // Typing broadcast
      const typingChan = supabase
        .channel(`support:typing:${chatId}`)
        .on("broadcast", { event: "typing" }, () => {
          setAdminIsTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setAdminIsTyping(false), 2500);
        })
        .subscribe();

      // Messages + status changes
      const msgChan = supabase
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
              if (payload.new.sender === "admin") {
                playNotificationSound();
                setUnreadCount((n) => (document.hidden || step === "closed" ? n + 1 : n));
              }
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
              if ((payload.new.rating ?? 0) > 0) setRatingPhase("done");
            }
          }
        )
        .subscribe((s) => setIsConnected(s === "SUBSCRIBED"));

      return () => {
        supabase.removeChannel(typingChan);
        supabase.removeChannel(msgChan);
        setIsConnected(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      };
    }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Polling fallback when realtime is not connected ──
    useEffect(() => {
      if (!chatId || isClosed) return;

      if (isConnected) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      pollIntervalRef.current = setInterval(async () => {
        const { data: msgs } = await supabase
          .from("support_messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true });
        if (msgs) setMessages(msgs as Message[]);

        const { data: chatStatus } = await supabase
          .from("support_chats")
          .select("status, rating")
          .eq("id", chatId)
          .single();
        if (chatStatus?.status === "closed") {
          setIsClosed(true);
          if ((chatStatus.rating ?? 0) > 0) setRatingPhase("done");
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }, [chatId, isConnected, isClosed]);

    // ── Actions ──
    const handleOpenChat = useCallback(async () => {
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
    }, [subject]);

    const handleSendMessage = useCallback(async () => {
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
          const without = prev.filter((m) => m.id !== tempId);
          return without.find((m) => m.id === inserted.id) ? without : [...without, inserted as Message];
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
    }, [inputText, chatId, isSending]);

    const handleRate = useCallback(async () => {
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
    }, [chatId, pendingRating, ratingComment]);

    const handleUserCloseChat = useCallback(async () => {
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
    }, [chatId]);

    const handleMinimize = useCallback(() => setStep("closed"), []);

    const handleDiscard = useCallback(() => {
      setStep("closed");
      setSubject("");
      setChatId(null);
      setMessages([]);
      setInputText("");
      setIsClosed(false);
      setPendingRating(0);
      setRatingComment("");
      setRatingPhase("stars");
      setUnreadCount(0);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }, []);

    const hasActiveChat = !!chatId && step === "closed";

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
      <>
        {/* ── Floating button (hidden when parent controls open) ── */}
        {step === "closed" && !hideTriggerButton && (
          <button
            onClick={() => (hasActiveChat ? setStep("chat") : setStep("subject"))}
            className="fixed bottom-6 right-6 z-50 group relative"
          >
            <div className="flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-200 hover:shadow-primary/50 hover:scale-105 active:scale-95">
              <MessageCircleMore className="h-5 w-5" />
              <span>{hasActiveChat ? "Continuar chat" : "Soporte"}</span>
              {hasActiveChat && (
                <span className="h-2 w-2 rounded-full bg-green-400 ring-2 ring-primary animate-pulse" />
              )}
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* ── Step 1: Welcome + Subject ── */}
        {step === "subject" && (
          <div className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden shadow-2xl shadow-black/15 border border-border/50 bg-background animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary/80 px-5 pt-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur ring-2 ring-white/30 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">FC</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm leading-tight">FirmaClara</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      <p className="text-white/70 text-xs">Soporte · en línea</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleMinimize}
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-white font-semibold text-lg leading-snug">
                Hola{firstName ? `, ${firstName}` : ""}! 👋
              </p>
              <p className="text-white/75 text-sm mt-1">¿En qué podemos ayudarte hoy?</p>
            </div>

            {/* Content card (overlaps header) */}
            <div className="mx-4 -mt-4 bg-background rounded-xl border border-border/60 shadow-sm p-4 mb-4 space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                <span>Normalmente respondemos en minutos</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Asunto</label>
                <input
                  autoFocus
                  className="w-full text-sm border border-input rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-background transition-all placeholder:text-muted-foreground/60"
                  placeholder="Ej: Problema con un documento..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOpenChat()}
                />
              </div>
              <Button
                className="w-full rounded-lg shadow-sm shadow-primary/20 font-semibold"
                onClick={handleOpenChat}
                disabled={!subject.trim() || isOpening}
              >
                {isOpening ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                ) : (
                  "Iniciar conversación →"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Live Chat ── */}
        {step === "chat" && (
          <div
            className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden shadow-2xl shadow-black/15 border border-border/50 bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            style={{ height: "480px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary/85 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur ring-2 ring-white/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">FC</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm leading-tight">FirmaClara · Soporte</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      isConnected ? "bg-green-400" : "bg-amber-400 animate-pulse"
                    )}
                  />
                  <p className="text-white/70 text-xs truncate max-w-[160px]">
                    {isClosed ? "Chat cerrado" : (subject || "Soporte en vivo")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isClosed && (
                  <button
                    onClick={handleUserCloseChat}
                    className="text-white/60 hover:text-white text-[11px] font-medium px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
                  >
                    Cerrar
                  </button>
                )}
                <button
                  onClick={handleMinimize}
                  className="h-7 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-1" style={{ background: "#f5f6f8" }}>
              {processed.map(({ msg, isFirst, isLast, showDaySep, dayLabel }) => {
                const isUser = msg.sender === "user";
                const isTemp = msg.id.startsWith("temp_");

                const userRounding = cn(
                  "rounded-2xl",
                  isFirst && isLast && "rounded-br-sm",
                  isFirst && !isLast && "rounded-br-sm",
                  !isFirst && isLast && "rounded-tr-sm",
                  !isFirst && !isLast && "rounded-r-sm"
                );
                const adminRounding = cn(
                  "rounded-2xl",
                  isFirst && isLast && "rounded-bl-sm",
                  isFirst && !isLast && "rounded-bl-sm",
                  !isFirst && isLast && "rounded-tl-sm",
                  !isFirst && !isLast && "rounded-l-sm"
                );

                return (
                  <Fragment key={msg.id}>
                    {showDaySep && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-black/8" />
                        <span className="text-[10px] font-medium text-black/30 uppercase tracking-wider px-1">
                          {dayLabel}
                        </span>
                        <div className="flex-1 h-px bg-black/8" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex max-w-[82%] flex-col gap-0",
                        isUser ? "ml-auto items-end" : "items-start",
                        isFirst ? "mt-2" : "mt-0.5",
                        isTemp && "opacity-70"
                      )}
                    >
                      <div
                        className={cn(
                          "px-3 py-2 text-sm break-words leading-relaxed",
                          isUser
                            ? cn("bg-primary text-primary-foreground shadow-sm shadow-primary/20", userRounding)
                            : cn("bg-white text-foreground shadow-sm ring-1 ring-black/5", adminRounding)
                        )}
                      >
                        {stripMarkdown(msg.content)}
                      </div>
                      {isLast && (
                        <span className="text-[10px] text-black/35 font-medium mt-1 px-1">
                          {!isUser && "Soporte · "}
                          {isTemp ? "Enviando..." : formatTime(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </Fragment>
                );
              })}

              {/* Typing indicator */}
              {adminIsTyping && !isClosed && (
                <div className="flex flex-col items-start gap-1 mt-2 animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-black/35 font-medium px-1">Soporte está escribiendo</span>
                </div>
              )}

              {/* Rating block */}
              {isClosed && (
                <div className="mt-3 mb-1 bg-white rounded-2xl border border-border/60 shadow-sm p-4 animate-in fade-in duration-300">
                  {ratingPhase === "stars" && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <span className="font-medium">Chat cerrado</span>
                      </div>
                      <p className="text-sm font-semibold text-center text-foreground">
                        ¿Cómo ha sido tu experiencia?
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => { setPendingRating(star); setRatingPhase("comment"); }}
                            className="text-muted-foreground/25 hover:text-yellow-400 transition-all hover:scale-125 active:scale-95 focus:outline-none"
                          >
                            <Star className="h-7 w-7" strokeWidth={1.5} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ratingPhase === "comment" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setPendingRating(star)}
                            className="transition-all hover:scale-110"
                          >
                            <Star
                              className={cn(
                                "h-5 w-5 transition-colors",
                                pendingRating >= star ? "text-yellow-400" : "text-muted-foreground/20"
                              )}
                              fill={pendingRating >= star ? "currentColor" : "none"}
                              strokeWidth={1.5}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 placeholder:text-muted-foreground/50 transition-all"
                        rows={3}
                        placeholder="Cuéntanos qué tal ha ido... (opcional)"
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPendingRating(0); setRatingPhase("stars"); }}
                          className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
                        >
                          ← Cambiar
                        </button>
                        <Button
                          size="sm"
                          onClick={handleRate}
                          disabled={isSubmittingRating}
                          className="flex-1 text-xs h-8 shadow-sm shadow-primary/20"
                        >
                          {isSubmittingRating
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : "Enviar valoración"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {ratingPhase === "done" && (
                    <div className="flex flex-col items-center gap-3 py-1">
                      <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">¡Gracias por tu feedback!</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Nos ayuda a mejorar el servicio.</p>
                      </div>
                      <button
                        onClick={handleDiscard}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
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
              <div className="flex items-center gap-2 px-3 py-3 border-t border-border/50 bg-background flex-shrink-0">
                <input
                  ref={inputRef}
                  className="flex-1 text-sm bg-secondary rounded-full px-4 py-2.5 outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Escribe tu mensaje..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                  }}
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                  className="h-9 w-9 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/50 disabled:opacity-40 disabled:shadow-none active:scale-90"
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
);
