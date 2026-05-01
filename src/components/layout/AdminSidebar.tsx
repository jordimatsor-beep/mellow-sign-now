import { Home, Users, CreditCard, LayoutDashboard, LogOut, ScrollText, MessageCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
    const { signOut } = useAuth();

    const navItems = [
        { to: "/shobdgohs/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/shobdgohs/users", icon: Users, label: "Usuarios" },
        { to: "/shobdgohs/credits", icon: CreditCard, label: "Créditos" },
        { to: "/shobdgohs/support", icon: MessageCircle, label: "Soporte en vivo" },
        { to: "/shobdgohs/logs", icon: ScrollText, label: "Logs" },
    ];

    return (
        <aside className="hidden w-64 flex-col border-r bg-slate-900 text-slate-100 md:flex h-full">
            {/* Logo - FirmaClara Branding */}
            <div className="flex bg-slate-950 py-4 justify-center border-b border-slate-800 px-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-tight">FirmaClara <span className="text-red-500 text-xs uppercase align-top">Admin</span></span>
                </div>
            </div>

            {/* Main nav */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                                        isActive
                                            ? "bg-red-600 text-white shadow-md shadow-red-900/20"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
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

            {/* Bottom Actions */}
            <div className="border-t border-slate-800 p-4 space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
                    asChild
                >
                    <NavLink to="/dashboard">
                        <Home className="h-4 w-4" />
                        Volver a la App
                    </NavLink>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2"
                    onClick={signOut}
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    );
}
