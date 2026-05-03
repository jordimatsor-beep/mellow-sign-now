import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageCircle, Send, CheckCircle, Clock, ShieldCheck, Mail, Search, AlertCircle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
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

  // Ref to always have current selectedChat in subscription callbacks (avoids stale closure)
  const selectedChatRef = useRef<ChatSession | null>(null);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Typing broadcast channel ref
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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

  // Initial load + global real-time subscriptions
  useEffect(() => {
    fetchChats(true);

    // Listen to new/updated chats - use functional updates to avoid stale closure
    const chatsChannel = supabase
      .channel("admin_support_chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chats" },
        (payload) => {
          setChats((prev) => [payload.new as ChatSession, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_chats" },
        (payload) => {
          const updated = payload.new as ChatSession;
          setChats((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          setSelectedChat((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        }
      )
      .subscribe();

    // Listen to all new messages for notifications and list updates
    const globalMessagesChannel = supabase
      .channel("admin_global_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          if (payload.new.sender === "user") {
            // Only notify if this is not the currently selected chat (to avoid double sound)
            if (selectedChatRef.current?.id !== payload.new.chat_id) {
              playNotificationSound();
            }
            // Update chat list: bump last_message_at and mark unread
            setChats((prev) =>
              prev
                .map((c) =>
                  c.id === payload.new.chat_id
                    ? { ...c, last_message_at: payload.new.created_at as string, admin_read: false }
                    : c
                )
                .sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(globalMessagesChannel);
    };
  }, [fetchChats]);

  // Typing broadcast channel — created when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;

    const chan = supabase.channel(`support:typing:${selectedChat.id}`);
    chan.subscribe();
    typingChannelRef.current = chan;

    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, [selectedChat?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    // Broadcast typing event with debounce (fire at most every 1s)
    if (!typingChannelRef.current || selectedChat?.status !== "open") return;
    if (typingDebounceRef.current) return; // already pending
    typingDebounceRef.current = setTimeout(() => {
      typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: {} });
      typingDebounceRef.current = null;
    }, 400);
  };

  // Load messages + per-chat subscription when selected chat changes
  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);

    // Mark as read by admin without triggering a full re-fetch
    if (!selectedChat.admin_read) {
      supabase
        .from("support_chats")
        .update({ admin_read: true })
        .eq("id", selectedChat.id)
        .then(() => {
          setChats((prev) =>
            prev.map((c) => (c.id === selectedChat.id ? { ...c, admin_read: true } : c))
          );
          setSelectedChat((prev) => (prev ? { ...prev, admin_read: true } : null));
        });
    }

    supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", selectedChat.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setMessages(data as Message[]);
          scrollToBottom();
        }
      });

    const channel = supabase
      .channel(`admin_chat_${selectedChat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Remove temp messages of the same sender when real message arrives
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith("temp_") && m.sender === payload.new.sender)
            );
            const exists = withoutTemp.find((m) => m.id === payload.new.id);
            if (exists) return withoutTemp;
            return [...withoutTemp, payload.new as Message];
          });
          scrollToBottom();

          // Auto-mark as read when message received while chat is selected
          if (payload.new.sender === "user") {
            supabase
              .from("support_chats")
              .update({ admin_read: true })
              .eq("id", selectedChat.id);
            setChats((prev) =>
              prev.map((c) => (c.id === selectedChat.id ? { ...c, admin_read: true } : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_id: selectedChat.id,
      sender: "admin",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: {
          action: "send_admin_message",
          chat_id: selectedChat.id,
          content: text,
        },
      });

      if (error) throw error;

      // Fetch the just-inserted message immediately — realtime may not fire for the
      // sender's own messages when the insert was done via service_role (RLS realtime).
      const { data: newMsg } = await supabase
        .from("support_messages")
        .select("*")
        .eq("chat_id", selectedChat.id)
        .eq("sender", "admin")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (!newMsg) return withoutTemp;
        if (withoutTemp.find((m) => m.id === newMsg.id)) return withoutTemp;
        return [...withoutTemp, newMsg as Message];
      });
      scrollToBottom();
    } catch (error) {
      console.error(error);
      toast.error("Error al enviar mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChat) return;
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "close_chat", chat_id: selectedChat.id },
      });
      if (error) throw error;
      toast.success("Chat cerrado correctamente");
      // State will update via the realtime UPDATE subscription on support_chats
    } catch (error) {
      console.error(error);
      toast.error("Error al cerrar el chat");
    }
  };

  const handleSelectChat = (chat: ChatSession) => {
    setSelectedChat(chat);
    setSearchParams({ chatId: chat.id });
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadChats = filteredChats.filter((c) => c.status === "open" && !c.admin_read);
  const activeChats = filteredChats.filter((c) => c.status === "open" && c.admin_read);
  const closedChats = filteredChats.filter((c) => c.status === "closed");

  const renderChatList = (list: ChatSession[]) => {
    if (isInitialLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm">No hay tickets en esta categoría.</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100">
        {list.map((chat) => (
          <button
            key={chat.id}
            onClick={() => handleSelectChat(chat)}
            className={cn(
              "w-full text-left p-4 transition-all flex flex-col gap-1.5 relative border-l-4",
              selectedChat?.id === chat.id
                ? "bg-white border-blue-600 shadow-sm"
                : "bg-transparent border-transparent hover:bg-slate-100/50",
              chat.status === "closed" && "opacity-70"
            )}
          >
            {!chat.admin_read && chat.status === "open" && selectedChat?.id !== chat.id && (
              <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200 animate-pulse" />
            )}
            <div className="flex justify-between items-start mr-4">
              <span className="font-medium text-sm truncate flex items-center gap-1.5 text-slate-700">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {chat.user_email}
              </span>
            </div>
            <span
              className={cn(
                "text-xs font-semibold truncate",
                selectedChat?.id === chat.id ? "text-blue-700" : "text-slate-900"
              )}
            >
              {chat.subject}
            </span>
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(chat.last_message_at), "HH:mm", { locale: es })}
              </span>
              {chat.status === "closed" ? (
                <div className="flex items-center gap-2">
                  {chat.rating && chat.rating > 0 ? (
                    <span className="flex items-center text-yellow-500 text-[10px] font-bold">
                      {chat.rating} <Star className="h-2.5 w-2.5 fill-current ml-0.5" />
                    </span>
                  ) : null}
                  <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                    Cerrado
                  </span>
                </div>
              ) : (
                <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                  {chat.admin_read ? "En Curso" : "Abierto"}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Centro de Soporte
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestiona los tickets de soporte de forma privada y segura.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <ShieldCheck className="h-4 w-4" />
          <span>Modo Seguro Admin</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-[600px]">
        {/* Chat List */}
        <Card className="md:col-span-4 lg:col-span-3 h-full flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="py-4 px-5 border-b bg-slate-50/50">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                Tickets
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {chats.filter((c) => c.status === "open").length} activos
              </span>
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ticket..."
                className="pl-9 h-9 bg-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50/30">
            <Tabs defaultValue="unread" className="h-full flex flex-col">
              <div className="px-4 py-3 border-b bg-white shrink-0 sticky top-0 z-10">
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger value="unread" className="text-[11px] font-semibold relative">
                    Nuevos
                    {unreadChats.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shadow-sm">
                        {unreadChats.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-[11px] font-semibold">
                    En Curso {activeChats.length > 0 && `(${activeChats.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="text-[11px] font-semibold">
                    Cerrados
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="unread" className="m-0 focus-visible:outline-none">
                  {renderChatList(unreadChats)}
                </TabsContent>
                <TabsContent value="active" className="m-0 focus-visible:outline-none">
                  {renderChatList(activeChats)}
                </TabsContent>
                <TabsContent value="closed" className="m-0 focus-visible:outline-none">
                  {renderChatList(closedChats)}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Active Chat Window */}
        <Card className="md:col-span-8 lg:col-span-9 h-full flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-xl">
          {selectedChat ? (
            <>
              <CardHeader className="py-4 px-6 border-b bg-white flex flex-row items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-800">
                      {selectedChat.subject}
                    </CardTitle>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      ID: {selectedChat.id.split("-")[0]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" /> {selectedChat.user_email}
                  </p>
                </div>
                {selectedChat.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseChat}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Marcar como Resuelto
                  </Button>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-50/80">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((msg, index) => {
                    const isAdmin = msg.sender === "admin";
                    const isTemp = msg.id.startsWith("temp_");
                    const showAvatar =
                      index === 0 || messages[index - 1].sender !== msg.sender;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex max-w-[85%] animate-in slide-in-from-bottom-2 duration-300 gap-3",
                          isAdmin ? "ml-auto flex-row-reverse" : "",
                          isTemp && "opacity-60"
                        )}
                      >
                        {showAvatar ? (
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                              isAdmin
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                                : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600"
                            )}
                          >
                            {isAdmin ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </div>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}

                        <div className={cn("flex flex-col", isAdmin ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "px-4 py-2.5 text-sm shadow-sm",
                              isAdmin
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm"
                                : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm"
                            )}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-medium">
                            {isTemp
                              ? "Enviando..."
                              : format(new Date(msg.created_at), "HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {selectedChat.status === "closed" && (
                    <div className="flex justify-center my-6 relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex flex-col items-center gap-2">
                        <span className="bg-slate-100 text-slate-500 text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 font-medium border border-slate-200 shadow-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Ticket Resuelto{" "}
                          {selectedChat.closed_by === "user"
                            ? "por el Usuario"
                            : selectedChat.closed_by === "admin"
                            ? "por Admin"
                            : ""}
                        </span>
                        {selectedChat.rating && selectedChat.rating > 0 ? (
                          <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full shadow-sm animate-in zoom-in duration-300">
                            <span className="text-xs font-semibold mr-1">Valoración:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  selectedChat.rating! >= star
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-yellow-200"
                                )}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 mt-auto shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                  <div
                    className={cn(
                      "flex gap-2 items-center bg-slate-50 border p-2 rounded-full transition-all duration-300",
                      isSending ? "opacity-70" : "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300",
                      selectedChat.status === "closed" ? "opacity-50 bg-slate-100" : ""
                    )}
                  >
                    <Input
                      placeholder={
                        selectedChat.status === "open"
                          ? "Escribe tu respuesta aquí..."
                          : "Este ticket está cerrado"
                      }
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      disabled={isSending || selectedChat.status === "closed"}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || isSending || selectedChat.status === "closed"}
                      className="rounded-full h-10 w-10 p-0 shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-transform active:scale-95"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 h-full">
              <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <MessageCircle className="h-10 w-10 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Soporte Privado</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Selecciona un ticket de la lista de la izquierda para ver la conversación detallada o
                responder al usuario.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
