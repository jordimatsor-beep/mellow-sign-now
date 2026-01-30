import { Home, FileText, Sparkles, CreditCard, Settings, HelpCircle, LogOut, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/Logo";

interface MobileMenuProps {
  onClose: () => void;
}

const menuItems = [
  { to: "/dashboard", icon: Home, label: "Inicio" },
  { to: "/documents", icon: FileText, label: "Mis documentos" },
  { to: "/clara", icon: Sparkles, label: "Asistente Clara" },
  { to: "/credits", icon: CreditCard, label: "Créditos" },
  { to: "/settings", icon: Settings, label: "Configuración" },
  { to: "/help", icon: HelpCircle, label: "Ayuda y FAQs" },
];

export function MobileMenu({ onClose }: MobileMenuProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Logo className="h-10 w-auto" />
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
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">Usuario Demo</p>
          <p className="text-xs text-muted-foreground">demo@firmaclara.es</p>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive">
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
