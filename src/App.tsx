
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EmployeeDocumentsPage from "@/components/dashboard/EmployeeDocumentsPage";
import ResetPasswordPage from "@/components/auth/ResetPasswordPage";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import AdminSettingsSection from "@/components/admin/AdminSettingsSection";
import EmployeeProfileSection from "@/components/dashboard/EmployeeProfileSection";
import DocumentTitleManager from "@/components/DocumentTitleManager";
import { PWAProvider } from "@/components/pwa/PWAProvider";

// Create QueryClient outside component to avoid recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PWAProvider>
          <BrowserRouter>
            <DocumentTitleManager />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/documents/:employeeId" element={<EmployeeDocumentsPage />} />
              <Route path="/settings" element={<AdminSettingsSection />} />
              <Route path="/employee/:id" element={<EmployeeProfileSection />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </PWAProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
