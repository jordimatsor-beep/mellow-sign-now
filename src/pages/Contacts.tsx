import { useState } from "react";
import { Plus, Search, Trash2, Edit2, Phone, Mail, MapPin, User, Loader2, Contact } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContactType {
    id: string;
    name: string;
    email: string;
    phone?: string;
    nif?: string;
    address?: string;
    created_at: string;
}

export default function Contacts() {
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [editingContact, setEditingContact] = useState<ContactType | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        nif: "",
        address: ""
    });

    // Fetch contacts with React Query - cached
    const { data: contacts = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.contacts.all,
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Contacts fetch timeout")), 5000)
            );

            const fetchPromise = (async () => {
                const { data, error } = await supabase
                    .from('contacts')
                    .select('*')
                    .order('name');
                if (error) throw error;
                return (data as ContactType[]) || [];
            })();

            return Promise.race([fetchPromise, timeoutPromise]);
        },
    });

    // Delete mutation with cache invalidation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('contacts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            toast.success("Contacto eliminado");
        },
        onError: (error: Error) => {
            toast.error("Error al eliminar: " + error.message);
        },
    });

    // Save mutation (create/update) with cache invalidation
    const saveMutation = useMutation({
        mutationFn: async (data: {
            isUpdate: boolean;
            contactId?: string;
            payload: {
                user_id: string;
                name: string;
                email: string;
                phone: string | null;
                nif: string | null;
                address: string | null;
            }
        }) => {
            if (data.isUpdate && data.contactId) {
                const { error } = await supabase.from('contacts').update(data.payload).eq('id', data.contactId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('contacts').insert(data.payload);
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            toast.success(variables.isUpdate ? "Contacto actualizado" : "Contacto creado");
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast.error("Error al guardar: " + error.message);
        },
    });

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("No autenticado");
            return;
        }

        const payload = {
            user_id: user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            nif: formData.nif || null,
            address: formData.address || null
        };

        saveMutation.mutate({
            isUpdate: !!editingContact,
            contactId: editingContact?.id,
            payload
        });
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const openEdit = (contact: ContactType) => {
        setEditingContact(contact);
        setFormData({
            name: contact.name,
            email: contact.email,
            phone: contact.phone || "",
            nif: contact.nif || "",
            address: contact.address || ""
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingContact(null);
        setFormData({ name: "", email: "", phone: "", nif: "", address: "" });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agenda de Contactos</h1>
                    <p className="text-muted-foreground">Gestiona tus firmantes frecuentes para agilizar envíos.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Contacto
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Mis Contactos</CardTitle>
                    <CardDescription>
                        Tienes {contacts.length} contactos guardados.
                    </CardDescription>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por nombre o email..."
                            className="pl-9 w-full md:w-[300px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-slate-50 border-dashed">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                <Contact className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-slate-900">No hay contactos</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {searchQuery ? "No se encontraron resultados para tu búsqueda." : "Empieza añadiendo tu primer firmante frecuente."}
                            </p>
                            {!searchQuery && (
                                <div className="mt-6">
                                    <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                                        <Plus className="mr-2 h-4 w-4" /> Añadir Contacto
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                                        <TableHead className="hidden lg:table-cell">NIF/CIF</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredContacts.map((contact) => (
                                        <TableRow key={contact.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {contact.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {contact.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{contact.email}</TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                                {contact.phone || "-"}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                                                {contact.nif || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(contact)}>
                                                        <Edit2 className="h-4 w-4 text-slate-500 hover:text-primary" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-slate-500 hover:text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción no se puede deshacer. Eliminarás a <strong>{contact.name}</strong> de tu agenda.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(contact.id)} className="bg-destructive hover:bg-destructive/90">
                                                                    Eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingContact ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
                        <DialogDescription>
                            Guarda los datos de tus firmantes habituales.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre *</Label>
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="name" required className="pl-9" placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nif">NIF/CIF</Label>
                                    <Input id="nif" placeholder="DNI o CIF" value={formData.nif} onChange={e => setFormData({ ...formData, nif: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" type="email" required className="pl-9" placeholder="cliente@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono (WhatsApp/SMS)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="phone" className="pl-9" placeholder="+34 600 000 000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="address" className="pl-9" placeholder="Calle, Ciudad..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {editingContact ? "Guardar Cambios" : "Crear Contacto"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
