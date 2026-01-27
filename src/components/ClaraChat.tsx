import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/context/ProfileContext";
import { supabase } from "@/lib/supabase";
import { Send, Sparkles, User, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- CONFIGURACIÓN DE SEGURIDAD Y SISTEMA ---
// Moved to Supabase Edge Function (clara-chat)


interface Message {
    id: string;
    role: "clara" | "user";
    content: string;
}

export function ClaraChat({ documentId }: { documentId?: string }) {
    const { t } = useTranslation();

    const [messages, setMessages] = useState<Message[]>(() => [
        {
            id: "1",
            role: "clara",
            content: t('clara.greeting'),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Auto-scroll effect
    useEffect(() => {
        if (scrollViewportRef.current) {
            setTimeout(() => {
                const viewport = scrollViewportRef.current;
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
            }, 100);
        }
    }, [messages, isTyping]);

    const sanitizeInput = (text: string) => {
        // Basic sanitization to prevent injection-like patterns in UI display
        return text.replace(/<[^>]*>?/gm, "").trim();
    };

    const { isProfileComplete } = useProfile();
    const navigate = useNavigate();

    const handleSend = async () => {
        const cleanInput = sanitizeInput(input);
        if (!cleanInput) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: cleanInput,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        // Check for Contract intent + Missing Profile
        const contractKeywords = ["contrato", "acuerdo", "redactar", "generar", "crear documento"];
        const hasContractIntent = contractKeywords.some(w => cleanInput.toLowerCase().includes(w));

        if (hasContractIntent && !isProfileComplete) {
            setIsTyping(false);
            setTimeout(() => {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "clara",
                        content: t('clara.missing_profile', "Antes de generar el texto legal, asegúrate de tener el DNI/CIF y domicilio de ambas partes. ¿Quieres ir a 'Editar perfil' o darmelos por aquí?"),
                    },
                ]);
            }, 600);
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('clara-chat', {
                body: {
                    messages: [...messages, userMessage],
                    documentId
                }
            });

            if (error) throw error;

            if (!data || !data.content) {
                throw new Error("Invalid response from server");
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "clara",
                content: data.content,
            };

            setMessages((prev) => [...prev, assistantMessage]);

        } catch (error: any) {
            console.error("🔴 Error calling Clara Edge Function:", error);

            let errorMessage = t('clara.error_processing');

            // Check for Rate Limit (429) or specific error messages from backend
            if (error.message?.includes("Rate limit") || error.status === 429 || error.toString().includes("429")) {
                errorMessage = t('clara.error_rate_limit');
            } else if (error.message?.includes("Unauthorized")) {
                errorMessage = t('clara.error_auth');
            } else if (error.status === 404 || error.message?.includes("not found") || error.message?.includes("404")) {
                errorMessage = "Error de conexión (404): El asistente no está disponible o no se ha desplegado correctamente. Por favor, verifica la configuración de Edge Functions.";
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "clara",
                    content: `${errorMessage} (Detalle: ${error.message || JSON.stringify(error)})`,
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-6 bg-slate-50/50" ref={scrollRef} viewportRef={scrollViewportRef}>
                <div className="space-y-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`flex max-w-[85%] gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                                    }`}
                            >
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
                                    className={`space-y-2 px-5 py-3 shadow-sm text-sm leading-relaxed ${message.role === "clara"
                                        ? "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100"
                                        : "bg-blue-600 text-white rounded-2xl rounded-tr-none"
                                        }`}
                                >
                                    {message.role === "clara" ? (
                                        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                    {message.content.includes("asegúrate de tener el DNI/CIF") && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={() => navigate("/onboarding")}
                                        >
                                            Ir a Editar Perfil
                                        </Button>
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
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>{t('clara.analyzing')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-3"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('clara.placeholder')}
                        className="flex-1 bg-slate-50"
                        disabled={isTyping}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="shrink-0"
                        disabled={!input.trim() || isTyping}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
