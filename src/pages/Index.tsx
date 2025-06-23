
import { useAuth } from "@/hooks/useAuth";
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

const Index = () => {
  const { user, profile, loading } = useAuth();

  console.log('Index render:', { user: !!user, profile, loading });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user || !profile) {
    console.log('Showing auth page - User:', !!user, 'Profile:', !!profile);
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthPage />
      </div>
    );
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

export default Index;
