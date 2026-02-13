import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Bell, Shield, LogOut, ChevronRight, Loader2, Download, Trash2, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { toast } from "sonner";
import { useDataExport } from "@/hooks/useDataExport";
import { useProfile } from "@/context/ProfileContext";

const settingsItems = [
  { icon: User, label: "Perfil", description: "Nombre, email, empresa", to: "#profile" },
  { icon: Bell, label: "Notificaciones", description: "Email y push", to: "#notifications" },
  { icon: Shield, label: "Seguridad", description: "Contraseña y 2FA", to: "#security" },
  { icon: FileText, label: "Legal", description: "Términos y Privacidad", to: "#legal" },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // GDPR states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { exportData, isExporting: exportingData } = useDataExport();
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification preferences (persisted to localStorage)
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('firmaclara_email_notifications');
    return saved !== null ? saved === 'true' : true;
  });
  const [autoReminders, setAutoReminders] = useState(() => {
    const saved = localStorage.getItem('firmaclara_auto_reminders');
    return saved !== null ? saved === 'true' : true;
  });

  // Save notification preferences to localStorage
  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('firmaclara_email_notifications', String(checked));
    toast.success(checked ? 'Notificaciones por email activadas' : 'Notificaciones por email desactivadas');
  };

  const handleAutoRemindersChange = (checked: boolean) => {
    setAutoReminders(checked);
    localStorage.setItem('firmaclara_auto_reminders', String(checked));
    toast.success(checked ? 'Recordatorios automáticos activados' : 'Recordatorios automáticos desactivados');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The updateProfile function from context already handles Supabase update and state management
      // We just need to trigger a toast if successful, though context might do it too.
      // But updateProfile is void/Promise<void>.
      // The context implementation shows it handles the update.
      // We are binding values directly in the onChange below, so submitting is just closing the dialog?
      // Wait, the current implementation in Context updates state optimistically but also sends to DB on every change?
      // No, let's check ProfileContext again.
      // updateProfile does: setProfile(prev => ...) AND supabase.update(..., eq(userId)).
      // So every keystroke would trigger an update if I put it in onChange.
      // That is bad for inputs.
      // I should have local state in the form and call updateProfile ONCE on submit.

      // Let's create a local state for the form.
      // But for now, to minimize diffs, I will keep the previous pattern but use updateProfile on Submit.
      // Wait, updateProfile takes `Partial<IssuerProfile>`.
      // So I should construct the object.

      await updateProfile({
        name: formState.name,
        id: formState.id, // Tax ID
        phone: formState.phone,
        address: formState.address,
        zip: formState.zip,
        city: formState.city,
        type: profile?.type || 'company' // Preserve existing type
      });

      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error(error);
      const message = error instanceof Error ? error.message : "Error al actualizar perfil";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Local state for form to avoid auto-saving on keystroke via context
  const [formState, setFormState] = useState({
    name: "",
    id: "",
    phone: "",
    address: "",
    zip: "",
    city: ""
  });

  // Sync local state when dialog opens
  useEffect(() => {
    if (isEditing && profile) {
      setFormState({
        name: profile.name || "",
        id: profile.id || "",
        phone: profile.phone || "",
        address: profile.address || "",
        zip: profile.zip || "",
        city: profile.city || ""
      });
    }
  }, [isEditing, profile]);

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword }),
        3000, "Password update"
      );
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
      setShowPasswordDialog(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  // GDPR: Export user data (Article 20 - Data Portability)
  const handleExportData = async () => {
    await exportData();
  };

  // GDPR: Delete account (Article 17 - Right to be Forgotten)
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINAR") return;

    setDeletingAccount(true);
    try {
      if (!user) throw new Error("No user logged in");

      // We call the Edge Function which runs with Service Role to delete the Auth User.
      // Database data will cascade delete based on Foreign Keys if configured,
      // or the function handles it.
      const { error } = await withTimeout(
        supabase.functions.invoke('delete-account'),
        3000, "Account deletion"
      );

      if (error) throw error;

      toast.success("Tu cuenta ha sido eliminada permanentemente");
      await signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error("Error al eliminar la cuenta. Contacta con soporte.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="container space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
      </div>

      {/* User card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground uppercase">
            {(profile?.name || user?.user_metadata?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario"}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {profile?.id && <p className="text-xs text-muted-foreground truncate">{profile.id}</p>}
          </div>

          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
                <DialogDescription>Completa tus datos para que aparezcan en los documentos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre / Razón Social</Label>
                    <Input id="name" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">NIF / CIF</Label>
                    <Input id="tax_id" value={formState.id} onChange={(e) => setFormState({ ...formState, id: e.target.value })} placeholder="B12345678" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} placeholder="+34 600..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={formState.address} onChange={(e) => setFormState({ ...formState, address: e.target.value })} placeholder="Calle..." />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="zip">C. Postal</Label>
                    <Input id="zip" value={formState.zip} onChange={(e) => setFormState({ ...formState, zip: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" value={formState.city} onChange={(e) => setFormState({ ...formState, city: e.target.value })} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Settings list */}
      <div className="space-y-1">
        {settingsItems.map((item) => (
          <div
            key={item.label}
            role="button"
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent cursor-pointer"
            onClick={() => {
              if (item.label === "Perfil") {
                setIsEditing(true);
                return;
              }

              if (item.to.startsWith("#")) {
                const id = item.to.substring(1);
                const element = document.getElementById(id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Add a subtle highlight effect
                  element.classList.add('bg-accent/20');
                  setTimeout(() => element.classList.remove('bg-accent/20'), 1000);
                }
              }
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <item.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        ))}
      </div>

      <Separator />

      {/* Quick settings */}
      {/* Quick settings - Notifications */}
      <div className="space-y-4 transition-colors duration-500 rounded-lg p-2 -mx-2" id="notifications">
        <h2 className="text-lg font-semibold">Preferencias de Notificaciones</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notificaciones por email</p>
            <p className="text-sm text-muted-foreground">
              Recibir avisos cuando firmen
            </p>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={handleEmailNotificationsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Recordatorios automáticos</p>
            <p className="text-sm text-muted-foreground">
              Enviar recordatorio a firmantes
            </p>
          </div>
          <Switch
            checked={autoReminders}
            onCheckedChange={handleAutoRemindersChange}
          />
        </div>
      </div>

      <Separator />



      {/* Security Section */}
      <div className="space-y-4 transition-colors duration-500 rounded-lg p-2 -mx-2" id="security">
        <h2 className="text-lg font-semibold">Seguridad</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Autenticación de dos pasos</p>
            <p className="text-sm text-muted-foreground">Más seguridad para tu cuenta</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.info("Próximamente")}>Configurar</Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Contraseña</p>
            <p className="text-sm text-muted-foreground">Cambiar tu contraseña actual</p>
          </div>
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Cambiar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
                  <Button onClick={handleChangePassword} disabled={loading || !newPassword}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Actualizar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* GDPR: Data & Privacy Section */}
      <div className="space-y-4" id="privacy">
        <h2 className="text-lg font-semibold">Privacidad y Datos (RGPD)</h2>

        {/* Export Data */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Exportar mis datos</p>
            <p className="text-sm text-muted-foreground">Descarga una copia de todos tus datos</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={exportingData}
          >
            {exportingData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar
          </Button>
        </div>

        {/* Delete Account */}
        {/* Delete Account - Made less prominent */}
        <div className="pt-4 mt-4 border-t border-border/50">
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 h-auto p-0 px-2 py-1 text-xs">
                Eliminar mi cuenta permanentemente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Eliminar cuenta permanentemente
                </DialogTitle>
                <DialogDescription>
                  Esta acción es irreversible. Se eliminarán permanentemente:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Tu perfil y datos personales</li>
                  <li>Todos tus documentos enviados y recibidos</li>
                  <li>Historial de firmas y certificados</li>
                  <li>Conversaciones con Clara</li>
                  <li>Créditos y historial de compras</li>
                  <li>Contactos guardados</li>
                </ul>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Escribe <span className="font-mono font-bold">ELIMINAR</span> para confirmar:
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "ELIMINAR" || deletingAccount}
                >
                  {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Eliminar cuenta permanentemente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* Logout */}
      <Button
        variant="ghost"
        type="button"
        className="w-full justify-start gap-3 text-destructive hover:text-destructive"
        onClick={() => {
          signOut().catch(console.error);
        }}
      >
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </Button>

      {/* Spacer to allow scrolling to bottom sections */}
      <div className="h-20" />
    </div>
  );
}
