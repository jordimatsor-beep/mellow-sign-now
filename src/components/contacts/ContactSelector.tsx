import { useState, useEffect } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    nif?: string | null;
    address?: string | null;
}

interface ContactSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (contact: Contact) => void;
}

export function ContactSelector({ isOpen, onClose, onSelect }: ContactSelectorProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('name');

            if (error) throw error;
            setContacts(data || []);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(contact =>
        (contact.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Contacto</DialogTitle>
                </DialogHeader>

                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ScrollArea className="h-[300px] mt-4 rounded-md border p-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                            <User className="h-10 w-10 text-slate-200" />
                            <div>
                                <p className="text-sm font-medium text-slate-900">No se encontraron contactos</p>
                                <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">
                                    {searchQuery ? "Intenta con otro nombre" : "Añade contactos frecuentes desde la sección Agenda"}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={onClose}>
                                Introducir manualmente
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredContacts.map(contact => (
                                <button
                                    key={contact.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 transition-colors text-left"
                                    onClick={() => {
                                        onSelect(contact);
                                        onClose();
                                    }}
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                        {(contact.name ?? 'NN').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-sm truncate">{contact.name || 'Sin nombre'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
