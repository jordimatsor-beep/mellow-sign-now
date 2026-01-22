import { Home, FileText, Sparkles, CreditCard, Settings, HelpCircle, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MulticentrosLogo, PoweredByOperia } from "@/components/brand/BrandHeader";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (user) {
      const fetchUserName = async () => {
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (data && data.name) {
          setUserName(data.name);
        } else {
          // Fallback to metadata if DB is empty or fetching fails, or email
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuario");
        }
      };
      fetchUserName();
    }
  }, [user]);

  const navItems = [
    { to: "/dashboard", icon: Home, label: t('nav.home') },
    { to: "/documents", icon: FileText, label: t('nav.documents') },
    { to: "/clara", icon: Sparkles, label: t('nav.clara') },
    { to: "/credits", icon: CreditCard, label: t('nav.credits') },
  ];

  const bottomItems = [
    { to: "/settings", icon: Settings, label: t('nav.settings') },
    { to: "/help", icon: HelpCircle, label: t('nav.help') },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex h-full">
      {/* Logo - Multicentros Branding */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <MulticentrosLogo className="h-8" />
      </div>
      
      {/* Service name */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-sm font-medium text-foreground">Firma Digital</span>
        <PoweredByOperia className="text-[10px]" />
      </div>

      {/* CTA */}
      <div className="p-4">
        <Button asChild className="w-full gap-2">
          <NavLink to="/documents/new">
            <Plus className="h-4 w-4" />
            {t('dashboard.new_document')}
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
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
