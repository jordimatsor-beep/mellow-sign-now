import { Home, FileText, Sparkles, CreditCard, Settings, HelpCircle, LogOut, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { to: "/dashboard", icon: Home, label: "Inicio" },
    { to: "/documents", icon: FileText, label: "Mis documentos" },
    { to: "/clara", icon: Sparkles, label: "Asistente Clara" },
    { to: "/credits", icon: CreditCard, label: "Créditos" },
    { to: "/settings", icon: Settings, label: "Configuración" },
    { to: "/help", icon: HelpCircle, label: "Ayuda y FAQs" },
  ];

  const handleLogout = () => {
    // Fire and forget
    signOut().catch(console.error);
    onClose();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-4">
        {user && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium truncate">
              {profile?.name || user.user_metadata?.full_name || "Usuario"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
