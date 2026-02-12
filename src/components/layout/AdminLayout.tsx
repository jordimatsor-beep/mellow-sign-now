import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Toaster } from "@/components/ui/sonner";

export const AdminLayout = () => {
    return (
        <div className="flex h-screen w-full bg-slate-50">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>
            <Toaster />
        </div>
    );
};
