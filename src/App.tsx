import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Context
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { RequireAuth } from "@/components/layout/RequireAuth";

// Error handling & GDPR
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";

// Layouts (eager — needed immediately)
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminRoute } from "@/components/layout/AdminRoute";

// Critical path pages (eager — first paint)
import Index from "@/pages/Index";
import Login from "@/pages/auth/Login";

// Lazy-loaded pages (downloaded only when navigated to)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documents = lazy(() => import("@/pages/Documents"));
const DocumentDetail = lazy(() => import("@/pages/DocumentDetail"));
const NewDocument = lazy(() => import("@/pages/NewDocument"));
const Templates = lazy(() => import("@/pages/Templates"));
const Credits = lazy(() => import("@/pages/Credits"));
const CreditsPurchase = lazy(() => import("@/pages/CreditsPurchase"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const SignDocument = lazy(() => import("@/pages/SignDocument"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Register = lazy(() => import("@/pages/auth/Register"));
const UpdatePassword = lazy(() => import("@/pages/auth/UpdatePassword"));
const AccountConfirmed = lazy(() => import("@/pages/auth/AccountConfirmed"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const Clara = lazy(() => import("@/pages/Clara"));
const Legal = lazy(() => import("@/pages/Legal"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const Precios = lazy(() => import("@/pages/Precios"));

// Admin pages (lazy — only for admins)
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UsersManager = lazy(() => import("@/pages/admin/UsersManager"));
const CreditsManager = lazy(() => import("@/pages/admin/CreditsManager"));
const AdminLogs = lazy(() => import("@/pages/admin/AdminLogs"));
const AdminSupportChats = lazy(() => import("@/pages/admin/AdminSupportChats"));
const AdminTeam = lazy(() => import("@/pages/admin/AdminTeam"));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

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
              <Suspense fallback={<PageLoader />}>
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
                    <Route path="/precios" element={<Precios />} />
                  </Route>

                  {/* Authenticated routes */}
                  <Route element={<RequireAuth />}>
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route element={<AuthenticatedLayout />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/documents/new" element={<NewDocument />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/documents/:id" element={<DocumentDetail />} />
                      <Route path="/credits" element={<Credits />} />
                      <Route path="/credits/purchase" element={<CreditsPurchase />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/clara" element={<Clara />} />
                    </Route>
                  </Route>

                  {/* Admin Routes (Stealth Mode) */}
                  <Route path="/shobdgohs" element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<Navigate to="/shobdgohs/dashboard" replace />} />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<UsersManager />} />
                      <Route path="credits" element={<CreditsManager />} />
                      <Route path="support" element={<AdminSupportChats />} />
                      <Route path="logs" element={<AdminLogs />} />
                      <Route path="team" element={<AdminTeam />} />
                    </Route>
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </TooltipProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
