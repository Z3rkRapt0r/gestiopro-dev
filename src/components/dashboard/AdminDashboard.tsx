
import { Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import AdminRoleDebug from "@/components/debug/AdminRoleDebug";
import AuthDebugInfo from "@/components/debug/AuthDebugInfo";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy imports for better performance
const AdminDashboardOverview = lazy(() => import("./AdminDashboardOverview"));
const AdminEmployeesSection = lazy(() => import("./AdminEmployeesSection"));
const AdminDocumentsSection = lazy(() => import("./AdminDocumentsSection"));
const AdminAttendanceSection = lazy(() => import("./AdminAttendanceSection"));
const AdminNotificationsSection = lazy(() => import("./AdminNotificationsSection"));
const AdminSettingsSection = lazy(() => import("@/components/admin/AdminSettingsSection"));

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const AdminDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader title="Dashboard Amministratore" />
        <div className="container mx-auto p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader title="Dashboard Amministratore" />
        <div className="container mx-auto p-6">
          <AuthDebugInfo />
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Accesso Negato
            </h2>
            <p className="text-gray-600">
              Solo gli amministratori possono accedere a questa sezione.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Usa il componente debug sopra per verificare lo stato dell'autenticazione.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Dashboard Amministratore" />
      <div className="container mx-auto p-6 space-y-8">
        <AuthDebugInfo />
        <AdminRoleDebug />
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminDashboardOverview />
        </Suspense>
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminEmployeesSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminDocumentsSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminAttendanceSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminNotificationsSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSkeleton />}>
          <AdminSettingsSection />
        </Suspense>
      </div>
    </div>
  );
};

export default AdminDashboard;
