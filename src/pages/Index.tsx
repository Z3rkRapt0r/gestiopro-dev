
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/components/auth/AuthPage";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy imports
const AdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("@/components/dashboard/EmployeeDashboard"));

// Loading skeleton
const DashboardSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-64 w-[32rem]" />
    </div>
  </div>
);

const IndexContent = () => {
  const { user, profile, loading } = useAuth();

  console.log('IndexContent render:', { user: !!user, profile, loading });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user || !profile) {
    console.log('Showing auth page - User:', !!user, 'Profile:', !!profile);
    return <AuthPage />;
  }

  console.log('User role:', profile.role);

  // Controllo di accesso rigoroso basato sul ruolo
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {profile.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </Suspense>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <IndexContent />
      </div>
    </AuthProvider>
  );
};

export default Index;
