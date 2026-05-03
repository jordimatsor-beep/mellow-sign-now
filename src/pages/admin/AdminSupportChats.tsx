import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, MessageCircle, Send, CheckCircle, ShieldCheck,
  Mail, Search, AlertCircle, Star, Clock, Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { playNotificationSound } from "@/lib/audio";

interface ChatSession {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string;
  user_read: boolean;
  admin_read: boolean;
  rating?: number;
  closed_by?: "user" | "admin";
}

interface Message {
  id: string;
  chat_id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(email: string): string {
  const parts = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").trim().split(" ");
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return format(d, "d 'de' MMMM", { locale: es });
}

function getRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  return formatDistanceToNow(d, { addSuffix: false, locale: es });
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
    return {
      msg,
      isFirst: !prev || prev.sender !== msg.sender,
      isLast: !next || next.sender !== msg.sender,
      showDaySep:
        i === 0 ||
        new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString(),
      dayLabel: getDayLabel(msg.created_at),
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSupportChats() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdParam = searchParams.get("chatId");

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChatRef = useRef<ChatSession | null>(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, []);

  const fetchChats = useCallback(async (isInitial = false) => {
    if (isInitial) setIsInitialLoading(true);
    const { data, error } = await supabase
      .from("support_chats")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (!error && data) {
      setChats(data as ChatSession[]);
      const current = selectedChatRef.current;
      if (current) {
        const updated = data.find((c) => c.id === current.id);
        if (updated) setSelectedChat(updated as ChatSession);
      } else if (chatIdParam) {
        const fromUrl = data.find((c) => c.id === chatIdParam);
        if (fromUrl) setSelectedChat(fromUrl as ChatSession);
      }
    }
    if (isInitial) setIsInitialLoading(false);
  }, [chatIdParam]);

  // ── Global subscriptions ──
  useEffect(() => {
    fetchChats(true);

    const chatsChannel = supabase
      .channel("admin_support_chats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_chats" },
        (payload) => setChats((prev) => [payload.new as ChatSession, ...prev])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_chats" },
        (payload) => {
          const updated = payload.new as ChatSession;
          setChats((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
          setSelectedChat((prev) => prev?.id === updated.id ? { ...prev, ...updated } : prev);
        }
      )
      .subscribe();

    const globalMsgChannel = supabase
      .channel("admin_global_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          if (payload.new.sender === "user") {
            if (selectedChatRef.current?.id !== payload.new.chat_id) playNotificationSound();
            setChats((prev) =>
              prev
                .map((c) =>
                  c.id === payload.new.chat_id
                    ? { ...c, last_message_at: payload.new.created_at as string, admin_read: false }
                    : c
                )
                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(globalMsgChannel);
    };
  }, [fetchChats]);

  // ── Typing broadcast channel ──
  useEffect(() => {
    if (!selectedChat) return;
    const chan = supabase.channel(`support:typing:${selectedChat.id}`);
    chan.subscribe();
    typingChannelRef.current = chan;
    return () => {
      if (typingChannelRef.current) { supabase.removeChannel(typingChannelRef.current); typingChannelRef.current = null; }
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, [selectedChat?.id]);

  // ── Per-chat messages ──
  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);

    if (!selectedChat.admin_read) {
      supabase.from("support_chats").update({ admin_read: true }).eq("id", selectedChat.id).then(() => {
        setChats((prev) => prev.map((c) => c.id === selectedChat.id ? { ...c, admin_read: true } : c));
        setSelectedChat((prev) => prev ? { ...prev, admin_read: true } : null);
      });
    }

    supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", selectedChat.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) { setMessages(data as Message[]); scrollToBottom(); }
      });

    const channel = supabase
      .channel(`admin_chat_${selectedChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          setMessages((prev) => {
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith("temp_") && m.sender === payload.new.sender)
            );
            if (withoutTemp.find((m) => m.id === payload.new.id)) return withoutTemp;
            return [...withoutTemp, payload.new as Message];
          });
          scrollToBottom();
          if (payload.new.sender === "user") {
            supabase.from("support_chats").update({ admin_read: true }).eq("id", selectedChat.id);
            setChats((prev) => prev.map((c) => c.id === selectedChat.id ? { ...c, admin_read: true } : c));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat?.id, scrollToBottom]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedChat || isSending) return;
    const text = inputText.trim();
    setInputText("");
    setIsSending(true);
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, chat_id: selectedChat.id, sender: "admin", content: text, created_at: new Date().toISOString() },
    ]);
    scrollToBottom();
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "send_admin_message", chat_id: selectedChat.id, content: text },
      });
      if (error) throw error;
      const { data: newMsg } = await supabase
        .from("support_messages")
        .select("*")
        .eq("chat_id", selectedChat.id)
        .eq("sender", "admin")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        if (!newMsg || without.find((m) => m.id === newMsg.id)) return without;
        return [...without, newMsg as Message];
      });
      scrollToBottom();
    } catch {
      toast.error("Error al enviar mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, selectedChat, isSending, scrollToBottom]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!typingChannelRef.current || selectedChat?.status !== "open") return;
    if (typingDebounceRef.current) return;
    typingDebounceRef.current = setTimeout(() => {
      typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: {} });
      typingDebounceRef.current = null;
    }, 400);
  }, [selectedChat?.status]);

  const handleCloseChat = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "close_chat", chat_id: selectedChat.id },
      });
      if (error) throw error;
      toast.success("Ticket marcado como resuelto");
    } catch {
      toast.error("Error al cerrar el chat");
    }
  }, [selectedChat]);

  const handleSelectChat = useCallback((chat: ChatSession) => {
    setSelectedChat(chat);
    setSearchParams({ chatId: chat.id });
  }, [setSearchParams]);

  // ── Filtered chat lists ──
  const filteredChats = useMemo(() =>
    chats.filter(
      (c) =>
        c.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase())
    ), [chats, searchQuery]);

  const unreadChats = useMemo(() => filteredChats.filter((c) => c.status === "open" && !c.admin_read), [filteredChats]);
  const activeChats = useMemo(() => filteredChats.filter((c) => c.status === "open" && c.admin_read), [filteredChats]);
  const closedChats = useMemo(() => filteredChats.filter((c) => c.status === "closed"), [filteredChats]);

  // ── Processed messages ──
  const processed = useMemo(() => processMessages(messages), [messages]);

  // ─── Chat list item ──────────────────────────────────────────────────────

  const renderChatList = (list: ChatSession[]) => {
    if (isInitialLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
          <span className="text-xs text-muted-foreground">Cargando tickets...</span>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-slate-300" />
          </div>
          <p className="text-xs text-muted-foreground">Sin tickets en esta categoría</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-border/50">
        {list.map((chat) => {
          const isSelected = selectedChat?.id === chat.id;
          const isUnread = !chat.admin_read && chat.status === "open";
          return (
            <button
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={cn(
                "w-full text-left px-4 py-3.5 transition-all relative border-l-[3px]",
                isSelected
                  ? "bg-primary/5 border-l-primary"
                  : "border-l-transparent hover:bg-slate-50/80",
                chat.status === "closed" && !isSelected && "opacity-60"
              )}
            >
              {isUnread && !isSelected && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary shadow-sm animate-pulse" />
              )}
              <div className="flex items-start gap-3">
                {/* User avatar */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-200 text-slate-600"
                )}>
                  {getInitials(chat.user_email)}
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "text-xs font-semibold truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {chat.subject}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {getRelativeTime(chat.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                      {chat.user_email}
                    </span>
                    {chat.status === "closed" ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(chat.rating ?? 0) > 0 && (
                          <span className="text-[10px] text-yellow-500 font-semibold flex items-center gap-0.5">
                            {chat.rating}<Star className="h-2.5 w-2.5 fill-current" />
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          Cerrado
                        </span>
                      </div>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                        isUnread
                          ? "text-primary bg-primary/10"
                          : "text-emerald-600 bg-emerald-50"
                      )}>
                        {isUnread ? "Nuevo" : "Activo"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-8rem)]">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Centro de Soporte</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los tickets de soporte en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/8 px-3 py-1.5 rounded-full border border-primary/15 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Modo Admin Seguro
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full min-h-[600px]">
        {/* ── Chat list panel ── */}
        <Card className="md:col-span-4 lg:col-span-3 h-full flex flex-col overflow-hidden border-border/60 shadow-sm rounded-xl">
          <CardHeader className="py-4 px-4 border-b bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <MessageCircle className="h-4 w-4 text-primary" />
                Tickets
              </CardTitle>
              {chats.filter((c) => c.status === "open").length > 0 && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {chats.filter((c) => c.status === "open").length} activos
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por asunto o email..."
                className="pl-8 h-8 bg-background text-xs border-border/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-y-auto">
            <Tabs defaultValue="unread" className="h-full flex flex-col">
              <div className="px-3 py-2.5 border-b bg-background shrink-0 sticky top-0 z-10">
                <TabsList className="grid w-full grid-cols-3 h-8 bg-slate-100">
                  <TabsTrigger value="unread" className="text-[11px] font-semibold relative px-0">
                    Nuevos
                    {unreadChats.length > 0 && (
                      <span className="ml-1 h-4 w-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadChats.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-[11px] font-semibold px-0">
                    Activos {activeChats.length > 0 && <span className="ml-1 opacity-60">({activeChats.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="text-[11px] font-semibold px-0">
                    Cerrados
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="unread" className="m-0 focus-visible:outline-none">{renderChatList(unreadChats)}</TabsContent>
                <TabsContent value="active" className="m-0 focus-visible:outline-none">{renderChatList(activeChats)}</TabsContent>
                <TabsContent value="closed" className="m-0 focus-visible:outline-none">{renderChatList(closedChats)}</TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* ── Chat window ── */}
        <Card className="md:col-span-8 lg:col-span-9 h-full flex flex-col overflow-hidden border-border/60 shadow-sm rounded-xl">
          {selectedChat ? (
            <>
              {/* Chat header */}
              <CardHeader className="py-3.5 px-5 border-b bg-background flex flex-row items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0 ring-1 ring-primary/20">
                    {getInitials(selectedChat.user_email)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold text-foreground truncate">{selectedChat.subject}</CardTitle>
                      <span className="text-[10px] font-mono text-muted-foreground/60 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        #{selectedChat.id.split("-")[0]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {selectedChat.user_email}
                    </p>
                  </div>
                </div>
                {selectedChat.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseChat}
                    className="border-primary/20 text-primary hover:bg-primary/5 hover:text-primary flex-shrink-0 text-xs font-semibold h-8"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Marcar resuelto
                  </Button>
                )}
              </CardHeader>

              {/* Messages */}
              <CardContent
                className="flex-1 flex flex-col p-0 overflow-hidden"
                style={{ background: "#f5f6f8" }}
              >
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                  {processed.map(({ msg, isFirst, isLast, showDaySep, dayLabel }) => {
                    const isAdmin = msg.sender === "admin";
                    const isTemp = msg.id.startsWith("temp_");

                    const adminRounding = cn(
                      "rounded-2xl",
                      isFirst && isLast && "rounded-bl-sm",
                      isFirst && !isLast && "rounded-bl-sm",
                      !isFirst && isLast && "rounded-tl-sm",
                      !isFirst && !isLast && "rounded-l-sm"
                    );
                    const userRounding = cn(
                      "rounded-2xl",
                      isFirst && isLast && "rounded-br-sm",
                      isFirst && !isLast && "rounded-br-sm",
                      !isFirst && isLast && "rounded-tr-sm",
                      !isFirst && !isLast && "rounded-r-sm"
                    );

                    return (
                      <Fragment key={msg.id}>
                        {showDaySep && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 h-px bg-black/8" />
                            <span className="text-[10px] font-semibold text-black/30 uppercase tracking-widest px-2">
                              {dayLabel}
                            </span>
                            <div className="flex-1 h-px bg-black/8" />
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex max-w-[75%] flex-col",
                            isAdmin ? "ml-auto items-end" : "items-start",
                            isFirst ? "mt-3" : "mt-0.5",
                            isTemp && "opacity-60"
                          )}
                        >
                          {/* Avatar only on first of group */}
                          <div className={cn("flex items-end gap-2", isAdmin ? "flex-row-reverse" : "")}>
                            {isFirst && (
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mb-1 text-xs font-bold",
                                isAdmin
                                  ? "bg-gradient-to-br from-primary to-primary/70 text-white shadow-sm"
                                  : "bg-slate-200 text-slate-600"
                              )}>
                                {isAdmin ? "FC" : getInitials(selectedChat.user_email)}
                              </div>
                            )}
                            {!isFirst && <div className="w-7 shrink-0" />}

                            <div
                              className={cn(
                                "px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-full",
                                isAdmin
                                  ? cn("bg-gradient-to-br from-primary to-primary/85 text-white shadow-md shadow-primary/20", adminRounding)
                                  : cn("bg-white text-foreground shadow-sm ring-1 ring-black/5", userRounding)
                              )}
                            >
                              {msg.content}
                            </div>
                          </div>

                          {isLast && (
                            <span className={cn(
                              "text-[10px] text-black/30 font-medium mt-1 px-9",
                              isAdmin ? "text-right" : ""
                            )}>
                              {isTemp
                                ? "Enviando..."
                                : format(new Date(msg.created_at), "HH:mm", { locale: es })}
                            </span>
                          )}
                        </div>
                      </Fragment>
                    );
                  })}

                  {/* Closed ticket separator */}
                  {selectedChat.status === "closed" && (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-black/8" />
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/80 shadow-sm">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          Resuelto{selectedChat.closed_by === "user" ? " por el usuario" : selectedChat.closed_by === "admin" ? " por admin" : ""}
                        </span>
                        <div className="flex-1 h-px bg-black/8" />
                      </div>
                      {(selectedChat.rating ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full shadow-sm">
                          <span className="text-xs font-semibold text-amber-700">Valoración:</span>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn("h-3.5 w-3.5", (selectedChat.rating ?? 0) >= s ? "fill-amber-400 text-amber-400" : "text-amber-200")}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
                  <div className={cn(
                    "flex gap-2 items-center bg-slate-50 border border-border/60 rounded-2xl px-3 py-1.5 transition-all duration-200",
                    selectedChat.status === "open"
                      ? "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30"
                      : "opacity-50"
                  )}>
                    <Input
                      placeholder={selectedChat.status === "open" ? "Escribe tu respuesta..." : "Ticket cerrado"}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      disabled={isSending || selectedChat.status === "closed"}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm placeholder:text-muted-foreground/50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isSending || selectedChat.status === "closed"}
                      size="sm"
                      className="rounded-xl h-8 w-8 p-0 shrink-0 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/25 transition-all active:scale-90"
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 rotate-3">
                <MessageCircle className="h-9 w-9 text-primary/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Sin conversación activa</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Selecciona un ticket de la lista para ver la conversación y responder al usuario.
              </p>
              {unreadChats.length > 0 && (
                <div className="mt-5 flex items-center gap-2 text-sm text-primary bg-primary/8 px-4 py-2 rounded-full border border-primary/15 font-medium animate-pulse">
                  <AlertCircle className="h-4 w-4" />
                  {unreadChats.length} ticket{unreadChats.length > 1 ? "s" : ""} nuevo{unreadChats.length > 1 ? "s" : ""} sin leer
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
