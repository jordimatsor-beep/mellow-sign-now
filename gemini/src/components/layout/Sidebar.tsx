import { Home, FileText, Sparkles, CreditCard, Settings, HelpCircle, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Inicio" },
  { to: "/documents", icon: FileText, label: "Documentos" },
  { to: "/clara", icon: Sparkles, label: "Clara" },
  { to: "/credits", icon: CreditCard, label: "Créditos" },
];

const bottomItems = [
  { to: "/settings", icon: Settings, label: "Configuración" },
  { to: "/help", icon: HelpCircle, label: "Ayuda" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">F</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">FirmaClara</span>
      </div>

      {/* CTA */}
      <div className="p-4">
        <Button asChild className="w-full gap-2">
          <NavLink to="/documents/new">
            <Plus className="h-4 w-4" />
            Nuevo documento
          </NavLink>
        </Button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom nav */}
      <nav className="border-t p-3">
        <ul className="space-y-1">
          {bottomItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            U
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">Usuario Demo</p>
            <p className="truncate text-xs text-muted-foreground">demo@firmaclara.es</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
