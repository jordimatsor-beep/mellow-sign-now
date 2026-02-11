import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/shared/CreditsBadge";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileMenu } from "./MobileMenu";
import { Logo } from "@/components/brand/Logo";
import { Separator } from "@/components/ui/separator";
import { useCredits } from "@/hooks/useCredits";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { credits } = useCredits();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo - FirmaClara */}
        <div className="flex items-center gap-3">
          <div className="flex items-center h-10 md:h-14 py-1">
            <Logo className="h-full w-auto object-contain" />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <CreditsBadge count={credits ?? 0} />

          {/* Mobile menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <MobileMenu onClose={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
