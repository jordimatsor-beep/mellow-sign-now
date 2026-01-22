import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Bell, Shield, LogOut, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const settingsItems = [
  { icon: User, label: "Perfil", description: "Nombre, email, empresa", to: "#profile" },
  { icon: Bell, label: "Notificaciones", description: "Email y push", to: "#notifications" },
  { icon: Shield, label: "Seguridad", description: "Contraseña y 2FA", to: "#security" },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    if (user) {
      // Load data from public.users instead of metadata
      const fetchUserData = async () => {
        const { data } = await supabase
          .from('users')
          .select('name, company_name')
          .eq('id', user.id)
          .single();

        if (data) {
          setFullName(data.name || "");
          setCompany(data.company_name || "");
        } else {
          // Fallback to metadata if DB entry missing
          setFullName(user.user_metadata?.full_name || "");
          setCompany(user.user_metadata?.company || "");
        }
      };
      fetchUserData();
    }
  }, [user]);

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

      // Optionally update auth metadata if we want to keep them in sync, 
      // but the requirement is to use public.users. 
      // updating metadata is good practice for session consistency if used elsewhere, 
      // but we will prioritize the table update as requested.

      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al actualizar perfil");
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
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
            onClick={(e) => {
              if (item.label === "Perfil") {
                e.preventDefault();
                setIsEditing(true);
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
          </Link>
        ))}
      </div>

      <Separator />

      {/* Quick settings */}
      {/* Quick settings - Notifications */}
      <div className="space-y-4" id="notifications">
        <h2 className="text-lg font-semibold">Preferencias de Notificaciones</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notificaciones por email</p>
            <p className="text-sm text-muted-foreground">
              Recibir avisos cuando firmen
            </p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Recordatorios automáticos</p>
            <p className="text-sm text-muted-foreground">
              Enviar recordatorio a firmantes
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      <Separator />



      {/* Security Section */}
      <div className="space-y-4" id="security">
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

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </Button>
    </div>
  );
}
