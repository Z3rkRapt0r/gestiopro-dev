
import { Suspense, lazy, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "./DashboardHeader";
import AdminDashboardSidebar from "./AdminDashboardSidebar";
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
  const [activeSection, setActiveSection] = useState<'overview' | 'employees' | 'documents' | 'attendance' | 'notifications' | 'settings'>('overview');

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
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Accesso Negato
            </h2>
            <p className="text-gray-600">
              Solo gli amministratori possono accedere a questa sezione.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminDashboardOverview />
          </Suspense>
        );
      case 'employees':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminEmployeesSection />
          </Suspense>
        );
      case 'documents':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminDocumentsSection />
          </Suspense>
        );
      case 'attendance':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminAttendanceSection />
          </Suspense>
        );
      case 'notifications':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminNotificationsSection />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminSettingsSection />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingSkeleton />}>
            <AdminDashboardOverview />
          </Suspense>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminDashboardSidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
      />
      
      <div className="flex-1">
        <DashboardHeader title="Dashboard Amministratore" />
        <div className="p-6">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
