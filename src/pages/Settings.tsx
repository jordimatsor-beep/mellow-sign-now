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

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setCompany(user.user_metadata?.company || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, company: company }
      });
      if (error) throw error;
      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar perfil");
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
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Preferencias rápidas</h2>

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
