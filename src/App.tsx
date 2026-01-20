import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Public signing page */}
          <Route element={<PublicLayout />}>
            <Route path="/sign/:token" element={<SignDocument />} />
          </Route>

          {/* Authenticated routes */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/new" element={<NewDocument />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/clara" element={<Clara />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/credits/purchase" element={<CreditsPurchase />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
