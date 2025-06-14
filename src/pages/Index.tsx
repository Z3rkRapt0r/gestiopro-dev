
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/components/auth/AuthPage";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";

const IndexContent = () => {
  const { user, profile, loading } = useAuth();

  console.log('IndexContent render:', { user: !!user, profile, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento...</p>
        </div>
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
      {profile.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <EmployeeDashboard />
      )}
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
