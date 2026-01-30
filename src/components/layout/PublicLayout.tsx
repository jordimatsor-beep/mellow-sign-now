import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Logo } from "@/components/brand/Logo";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo className="h-10 w-auto" />
          </div>
          <nav>
            <a href="/" className="flex items-center gap-2 text-base font-semibold text-foreground/80 hover:text-primary transition-colors hover:scale-105 active:scale-95">
              Inicio
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
