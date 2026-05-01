import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageCircle, Send, CheckCircle, Clock, ShieldCheck, Mail, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all open chats
  useEffect(() => {
    fetchChats();
    
    // Subscribe to new chats and updates
    const channel = supabase
      .channel("admin_support_chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChats = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("support_chats")
      .select("*")
      .order("last_message_at", { ascending: false });
      
    if (!error && data) {
      setChats(data as ChatSession[]);
      // Update selected chat if it exists to get new status
      if (selectedChat) {
        const updated = data.find((c) => c.id === selectedChat.id);
        if (updated) setSelectedChat(updated as ChatSession);
      } else if (chatIdParam) {
        // Auto-select from URL
        const fromUrl = data.find((c) => c.id === chatIdParam);
        if (fromUrl) {
          setSelectedChat(fromUrl as ChatSession);
        }
      }
    }
    setIsLoading(false);
  };

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    // Mark as read by admin
    if (!selectedChat.admin_read) {
      supabase
        .from("support_chats")
        .update({ admin_read: true })
        .eq("id", selectedChat.id)
        .then(() => fetchChats());
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("chat_id", selectedChat.id)
        .order("created_at", { ascending: true });
        
      if (!error && data) {
        setMessages(data as Message[]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`admin_chat_${selectedChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          
          // Mark as read if receiving message while selected
          if (payload.new.sender === "user") {
             supabase.from("support_chats").update({ admin_read: true }).eq("id", selectedChat.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat || isSending) return;
    
    const text = inputText.trim();
    setInputText("");
    setIsSending(true);
    
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { 
          action: "send_admin_message", 
          chat_id: selectedChat.id,
          content: text
        }
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error(error);
      toast.error("Error al enviar mensaje");
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChat) return;
    
    try {
      const { error } = await supabase.functions.invoke("contact-support", {
        body: { action: "close_chat", chat_id: selectedChat.id }
      });
      
      if (error) throw error;
      toast.success("Chat cerrado correctamente");
      setSelectedChat({ ...selectedChat, status: "closed" });
    } catch (error) {
      console.error(error);
      toast.error("Error al cerrar el chat");
    }
  };

  const handleSelectChat = (chat: ChatSession) => {
    setSelectedChat(chat);
    setSearchParams({ chatId: chat.id });
  };

  const filteredChats = chats.filter((chat) => 
    chat.user_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Centro de Soporte</h2>
          <p className="text-muted-foreground mt-1">Gestiona los tickets de soporte de forma privada y segura.</p>
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
                {chats.filter(c => c.status === 'open').length} activos
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">Cargando tickets...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm">No se encontraron tickets.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredChats.map((chat) => (
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
                    <span className={cn("text-xs font-semibold truncate", 
                      selectedChat?.id === chat.id ? "text-blue-700" : "text-slate-900"
                    )}>{chat.subject}</span>
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100/50 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(chat.last_message_at), "HH:mm", { locale: es })}
                      </span>
                      {chat.status === "closed" ? (
                        <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">Cerrado</span>
                      ) : (
                        <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">Abierto</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Chat Window */}
        <Card className="md:col-span-8 lg:col-span-9 h-full flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-xl">
          {selectedChat ? (
            <>
              <CardHeader className="py-4 px-6 border-b bg-white flex flex-row items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-800">{selectedChat.subject}</CardTitle>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ID: {selectedChat.id.split('-')[0]}</span>
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
              
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/80">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((msg, index) => {
                    const isAdmin = msg.sender === "admin";
                    const showAvatar = index === 0 || messages[index - 1].sender !== msg.sender;
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex max-w-[85%] animate-in slide-in-from-bottom-2 duration-300 gap-3",
                          isAdmin ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        {showAvatar ? (
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            isAdmin ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600"
                          )}>
                            {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                          </div>
                        ) : (
                          <div className="w-8 shrink-0" /> // Spacer
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
                            {format(new Date(msg.created_at), "HH:mm", { locale: es })}
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
                      <div className="relative flex justify-center">
                        <span className="bg-slate-100 text-slate-500 text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 font-medium border border-slate-200 shadow-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Ticket Resuelto y Cerrado
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 mt-auto shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                  <div className={cn(
                    "flex gap-2 items-center bg-slate-50 border p-2 rounded-full transition-all duration-300",
                    isSending ? "opacity-70" : "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300",
                    selectedChat.status === "closed" ? "opacity-50 bg-slate-100" : ""
                  )}>
                    <Input
                      placeholder={selectedChat.status === "open" ? "Escribe tu respuesta aquí..." : "Este ticket está cerrado"}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isSending || selectedChat.status === "closed"}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 text-sm"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!inputText.trim() || isSending || selectedChat.status === "closed"}
                      className="rounded-full h-10 w-10 p-0 shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-transform active:scale-95"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-1" />}
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
                Selecciona un ticket de la lista de la izquierda para ver la conversación detallada o responder al usuario.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
