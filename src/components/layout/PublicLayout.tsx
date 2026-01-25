import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">FirmaClara</span>
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
