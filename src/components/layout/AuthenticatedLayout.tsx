import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";

export function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="md:hidden">
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <BottomNavigation />
      </div>
    </div>
  );
}
