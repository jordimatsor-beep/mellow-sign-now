import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import StealthLogin from "@/pages/admin/StealthLogin";

export const AdminRoute = () => {
    const { profile, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#FDF6E3]">
                {/* Fake loading for fruit shop */}
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // "Super Admin" backdoor via email (hardcoded for safety)
    const isSuperAdmin = user?.email === 'jormattor@gmail.com';
    const isAdminRole = profile?.role === 'admin';

    // If authorized, show the Admin Layout (Outlet)
    // We check if we are at the root /shobdgohs to redirect to dashboard, otherwise render children
    if (user && (isSuperAdmin || isAdminRole)) {
        return <Outlet />;
    }

    // If NOT authorized (not logged in OR logged in as normal user), show the DISGUISE
    // This effectively hides the admin panel. Normal users seeing this URL will just see a fruit shop login.
    // If they try to login with normal credentials, they might get in but `isAdminRole` will fail again, 
    // keeping them here (or we need to handle the login success in StealthLogin to redirect ONLY if admin).
    return <StealthLogin />;
};
