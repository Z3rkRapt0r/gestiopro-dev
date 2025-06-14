import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/components/auth/AuthPage";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("@/components/dashboard/EmployeeDashboard"));

// Skeleton placeholder per la dashboard
const DashboardSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div>
      <Skeleton className="h-10 w-64 mb-6" />
      <Skeleton className="h-6 w-96 mb-3" />
      <Skeleton className="h-6 w-96 mb-3" />
      <Skeleton className="h-64 w-[32rem]" />
    </div>
  </div>
);

const IndexContent = () => {
  const { user, profile, loading } = useAuth();

  console.log('IndexContent render:', { user: !!user, profile, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user || !profile) {
    console.log('Showing auth page - User:', !!user, 'Profile:', !!profile);
    return <AuthPage />;
  }

  console.log('User role:', profile.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<DashboardSkeleton />}>
        {profile.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <EmployeeDashboard />
        )}
      </Suspense>
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <IndexContent />
    </AuthProvider>
  );
};

export default Index;
