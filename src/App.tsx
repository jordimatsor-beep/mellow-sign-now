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

// Pages
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
import Register from "@/pages/auth/Register";
import UpdatePassword from "@/pages/auth/UpdatePassword";
import Contacts from "@/pages/Contacts";
import Legal from "@/pages/Legal";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import HowItWorks from "@/pages/HowItWorks";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <CookieConsent />
            <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/update-password" element={<UpdatePassword />} />

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

              {/* Redirects */}


              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
