import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Context
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { RequireAuth } from "@/components/layout/RequireAuth";

// Error handling & GDPR
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";

// Layouts
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminRoute } from "@/components/layout/AdminRoute";

// Pages
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Documents from "@/pages/Documents";
import DocumentDetail from "@/pages/DocumentDetail";
import NewDocument from "@/pages/NewDocument";
import Clara from "@/pages/Clara";
import Credits from "@/pages/Credits";
import CreditsPurchase from "@/pages/CreditsPurchase";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Onboarding from "@/pages/Onboarding";
import SignDocument from "@/pages/SignDocument";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UsersManager from "@/pages/admin/UsersManager";
import CreditsManager from "@/pages/admin/CreditsManager";
import Register from "@/pages/auth/Register";
import UpdatePassword from "@/pages/auth/UpdatePassword";
import AccountConfirmed from "@/pages/auth/AccountConfirmed";
import Contacts from "@/pages/Contacts";
import Legal from "@/pages/Legal";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import HowItWorks from "@/pages/HowItWorks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30,        // 30 minutes in cache (formerly cacheTime)
      retry: 2,                       // 2 retries on error
      refetchOnWindowFocus: false,   // Don't refetch when switching tabs
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <CookieConsent />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/account-confirmed" element={<AccountConfirmed />} />

                {/* Public signing page & Content pages */}
                <Route element={<PublicLayout />}>
                  <Route path="/sign/:token" element={<SignDocument />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                </Route>

                {/* Authenticated routes */}
                <Route element={<RequireAuth />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route element={<AuthenticatedLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/documents/new" element={<NewDocument />} />
                    <Route path="/documents/:id" element={<DocumentDetail />} />
                    <Route path="/clara" element={<Clara />} />
                    <Route path="/credits" element={<Credits />} />
                    <Route path="/credits/purchase" element={<CreditsPurchase />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                  </Route>
                </Route>


                {/* Admin Routes (Stealth Mode) */}
                <Route path="/shobdgohs" element={<AdminRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="/shobdgohs/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UsersManager />} />
                    <Route path="credits" element={<CreditsManager />} />
                  </Route>
                </Route>

                {/* Redirects */}


                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
