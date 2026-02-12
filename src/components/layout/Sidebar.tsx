import { Home, FileText, Sparkles, CreditCard, Settings, HelpCircle, Plus, User, LifeBuoy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/brand/Logo";
import { useCredits } from "@/hooks/useCredits";

export function Sidebar() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { credits } = useCredits();

  const userName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";

  const navItems = [
    { to: "/dashboard", icon: Home, label: t('nav.home') },
    { to: "/documents", icon: FileText, label: t('nav.documents') },
    { to: "/contacts", icon: User, label: t('nav.contacts') },
    { to: "/clara", icon: Sparkles, label: t('nav.clara') },
    { to: "/credits", icon: CreditCard, label: t('nav.credits'), badge: credits },
    { to: "/support", icon: LifeBuoy, label: t('nav.support') },
  ];

  const bottomItems = [
    { to: "/settings", icon: Settings, label: t('nav.settings') },
    { to: "/help", icon: HelpCircle, label: t('nav.help') },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex h-full">
      {/* Logo - FirmaClara Branding */}
      <div className="flex bg-white py-4 justify-center border-b px-2">
        <Logo className="h-20 w-auto" />
      </div>



      {/* CTA */}
      <div className="p-4">
        <Button asChild className="w-full gap-2">
          <NavLink to="/documents/new">
            <Plus className="h-4 w-4" />
            Nuevo Envío
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    item.to === "/clara" && !isActive && "border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.2)] bg-gradient-to-r from-primary/5 to-transparent text-primary hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:border-primary/30"
                  )
                }
              >
                <item.icon className={cn("h-5 w-5", item.to === "/clara" && "text-primary animate-pulse")} />
                {item.label}
                {item.to === "/clara" && (
                  <span className="ml-auto inline-flex h-2 w-2 animate-ping rounded-full bg-primary/60 opacity-75"></span>
                )}
                {item.badge !== undefined && item.badge !== null && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
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
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Footer - Powered by Operia (subtle) */}
      <div className="border-t px-4 py-3 bg-muted/30">
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Tecnología <span className="font-medium">OPERIA</span>
        </p>
      </div>
    </aside>
  );
}
