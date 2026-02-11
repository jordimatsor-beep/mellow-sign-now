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
import { Link } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const QUICK_ACTIONS = [
    { label: "📄 Crear contrato servicios", prompt: "Quiero crear un contrato de prestación de servicios" },
    { label: "💰 Crear presupuesto", prompt: "Quiero crear un presupuesto para un cliente" },
    { label: "🤝 Acuerdo colaboración", prompt: "Necesito un contrato de colaboración entre empresas" },
    { label: "🔒 NDA / Confidencialidad", prompt: "Quiero crear un acuerdo de confidencialidad (NDA)" },
    { label: "✅ Autorización imagen", prompt: "Necesito una autorización para uso de imagen" },
];

// --- CONFIGURACIÓN DE SEGURIDAD Y SISTEMA ---
// Moved to Supabase Edge Function (clara-chat)


interface Message {
    id: string;
    role: "clara" | "user";
    content: string;
}

export function ClaraChat({
    documentId,
    endpoint = 'clara-chat',
    initialMessage
}: {
    documentId?: string;
    endpoint?: string;
    initialMessage?: string;
}) {
    const { t } = useTranslation();

    const [messages, setMessages] = useState<Message[]>(() => [
        {
            id: "1",
            role: "clara",
            content: initialMessage || t('clara.greeting'),
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

    // Fetch credits for INC-013
    const { data: credits = 0 } = useQuery({
        queryKey: ['credits-check'], // Simple key for now specific to this component or reuse global if available
        queryFn: async () => {
            const { data } = await supabase.from('user_credit_purchases').select('credits_total, credits_used');
            if (data) {
                return data.reduce((acc, pack) => acc + (pack.credits_total || 0) - (pack.credits_used || 0), 0);
            }
            return 0;
        }
    });

    const handleQuickAction = (prompt: string) => {
        if (credits <= 0) {
            toast.error("Necesitas créditos para usar el asistente.");
            return;
        }
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: prompt,
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        // Trigger send logic (need to extract it or call handleSend with param? handleSend uses 'input' state)
        // Refactoring handleSend to accept optional text would be better.
        // For now, let's just use effect or refactor handleSend.
        // Let's refactor handleSend signature slightly.
        processMessage(prompt);
    };

    const processMessage = async (messageText: string) => {
        setIsTyping(true);

        // Intent check
        const contractKeywords = ["contrato", "acuerdo", "redactar", "generar", "crear documento"];
        const hasContractIntent = contractKeywords.some(w => messageText.toLowerCase().includes(w));

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
            const { data, error } = await supabase.functions.invoke(endpoint, {
                body: {
                    messages: [...messages, { role: 'user', content: messageText }], // Note: messages state might not be updated yet if called immediately after setMessages. 
                    // Better to pass the new history explicitly.
                    // Actually, setMessages is async. We should reconstruct history here.
                    documentId
                }
            });
            if (error) throw error;
            if (!data || !data.content) throw new Error("Invalid response");

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "clara",
                content: data.content,
            };
            setMessages((prev) => [...prev, assistantMessage]);

        } catch (error: any) {
            console.error("Clara Error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "clara",
                    content: "Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo.",
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async () => {
        const cleanInput = sanitizeInput(input);
        if (!cleanInput) return;

        if (credits <= 0) {
            toast.error("No tienes créditos suficientes", {
                description: "Compra un pack de créditos para usar el asistente.",
                action: {
                    label: "Comprar",
                    onClick: () => navigate('/credits/purchase')
                }
            });
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: cleanInput,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        await processMessage(cleanInput);
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
                                    <Sparkles className="h-4 w-4 animate-pulse" />
                                </div>
                                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-100 px-5 py-4 shadow-sm">
                                    <div className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </ScrollArea>

            {/* Quick Actions (Only if no messages or just greeting) */}
            {messages.length <= 1 && (
                <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {QUICK_ACTIONS.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => handleQuickAction(action.prompt)}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
