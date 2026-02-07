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
import { toast } from "sonner";

const settingsItems = [
  { icon: User, label: "Perfil", description: "Nombre, email, empresa", to: "#profile" },
  { icon: Bell, label: "Notificaciones", description: "Email y push", to: "#notifications" },
  { icon: Shield, label: "Seguridad", description: "Contraseña y 2FA", to: "#security" },
  { icon: FileText, label: "Legal", description: "Términos y Privacidad", to: "#legal" },
];

export default function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // GDPR states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exportingData, setExportingData] = useState(false);
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

  useEffect(() => {
    if (user) {
      setFullName(profile?.name || user.user_metadata?.full_name || "");
      setCompany(profile?.company_name || user.user_metadata?.company || "");
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error("No user logged in");

      // Update public.users table
      const { error } = await supabase
        .from('users')
        .update({
          name: fullName,
          company_name: company
        })
        .eq('id', user.id);

      if (error) throw error;

      // Sync Auth Metadata so it doesn't revert if database fetch fails (and for sidebar consistency)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, company: company }
      });

      if (authError && import.meta.env.DEV) console.warn("Failed to sync auth metadata", authError);

      await refreshProfile(); // Refresh context to update UI globally

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

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
    setExportingData(true);
    try {
      if (!user) throw new Error("No user logged in");

      // Fetch only user-provided data (GDPR Article 20 - Data Portability)
      const [userData, documentsData, contactsData, creditsData] = await Promise.all([
        supabase.from('users').select('name, email, tax_id, address, city, zip_code, country, phone, company_name').eq('id', user.id).single(),
        supabase.from('documents').select('title, status, created_at, signed_at, signer_email, signer_name').eq('user_id', user.id),
        supabase.from('contacts').select('name, email, phone, nif, address').eq('user_id', user.id),
        supabase.from('credit_packs').select('packs, amount, cost, created_at').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_email: user.email,
        profile: userData.data,
        documents: documentsData.data || [],
        contacts: contactsData.data || [],
        purchase_history: creditsData.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmaclara_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Datos exportados correctamente");
    } catch (error: any) {
      console.error(error);
      toast.error("Error al exportar los datos");
    } finally {
      setExportingData(false);
    }
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
      const { error } = await supabase.functions.invoke('delete-account');

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
            {fullName ? fullName.substring(0, 2) : user?.email?.substring(0, 2) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{fullName || "Usuario sin nombre"}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {company && <p className="text-xs text-muted-foreground truncate">{company}</p>}
          </div>

          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opcional" />
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-destructive">Eliminar mi cuenta</p>
            <p className="text-sm text-muted-foreground">Borrar permanentemente todos tus datos</p>
          </div>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
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
        className="w-full justify-start gap-3 text-destructive hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </Button>

      {/* Spacer to allow scrolling to bottom sections */}
      <div className="h-20" />
    </div>
  );
}
