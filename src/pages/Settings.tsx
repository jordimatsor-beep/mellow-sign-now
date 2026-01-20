import { Link } from "react-router-dom";
import { ArrowLeft, User, Bell, Shield, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const settingsItems = [
  { icon: User, label: "Perfil", description: "Nombre, email, empresa", to: "#" },
  { icon: Bell, label: "Notificaciones", description: "Email y push", to: "#" },
  { icon: Shield, label: "Seguridad", description: "Contraseña y 2FA", to: "#" },
];

export default function Settings() {
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            UD
          </div>
          <div className="flex-1">
            <p className="font-semibold">Usuario Demo</p>
            <p className="text-sm text-muted-foreground">demo@firmaclara.es</p>
          </div>
          <Button variant="outline" size="sm">
            Editar
          </Button>
        </CardContent>
      </Card>

      {/* Settings list */}
      <div className="space-y-1">
        {settingsItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
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
      >
        <LogOut className="h-5 w-5" />
        Cerrar sesión
      </Button>
    </div>
  );
}
