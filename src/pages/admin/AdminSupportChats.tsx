import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageCircle, Send, CheckCircle, Clock } from "lucide-react";
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
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-8rem)]">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Soporte en Vivo</h2>
        <p className="text-muted-foreground">Gestiona las consultas de los usuarios en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
        {/* Chat List */}
        <Card className="md:col-span-1 h-full flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Chats Abiertos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No hay chats activos.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1 relative",
                      selectedChat?.id === chat.id && "bg-muted",
                      chat.status === "closed" && "opacity-60"
                    )}
                  >
                    {!chat.admin_read && chat.status === "open" && (
                      <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                    <div className="flex justify-between items-start mr-4">
                      <span className="font-medium text-sm truncate">{chat.user_email}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">{chat.subject}</span>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(chat.last_message_at), "HH:mm", { locale: es })}
                      </span>
                      {chat.status === "closed" ? (
                        <span className="text-red-500 font-medium">Cerrado</span>
                      ) : (
                        <span className="text-green-600 font-medium">Activo</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Chat Window */}
        <Card className="md:col-span-2 h-full flex flex-col overflow-hidden">
          {selectedChat ? (
            <>
              <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedChat.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedChat.user_email}</p>
                </div>
                {selectedChat.status === "open" && (
                  <Button variant="outline" size="sm" onClick={handleCloseChat}>
                    Marcar como Resuelto
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.sender === "admin" ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 text-sm shadow-sm",
                          msg.sender === "admin"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border text-slate-800 rounded-bl-sm"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 px-1">
                        {format(new Date(msg.created_at), "HH:mm", { locale: es })}
                      </span>
                    </div>
                  ))}
                  {selectedChat.status === "closed" && (
                    <div className="flex justify-center my-4">
                      <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Chat cerrado
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-white border-t mt-auto">
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedChat.status === "open" ? "Escribe una respuesta..." : "Chat cerrado"}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isSending || selectedChat.status === "closed"}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!inputText.trim() || isSending || selectedChat.status === "closed"}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center h-full">
              <MessageCircle className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-lg font-medium text-slate-600">Ningún chat seleccionado</p>
              <p className="text-sm">Selecciona un chat de la lista para ver la conversación o responder.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
