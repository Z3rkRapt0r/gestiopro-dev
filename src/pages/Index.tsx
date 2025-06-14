
import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Building, Shield, Users } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<{ role: 'admin' | 'employee'; name: string; email: string } | null>(null);

  const handleLogin = (credentials: { email: string; password: string }) => {
    // Demo login logic - in realtà si collegherebbe a Supabase
    if (credentials.email === "admin@serramenti.com" && credentials.password === "admin123") {
      setUser({ role: 'admin', name: 'Mario Rossi', email: 'admin@serramenti.com' });
    } else if (credentials.email === "dipendente@serramenti.com" && credentials.password === "user123") {
      setUser({ role: 'employee', name: 'Giuseppe Verdi', email: 'dipendente@serramenti.com' });
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Building className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SerramentiCorp</h1>
            <p className="text-gray-600">Sistema di Gestione Aziendale</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <LoginForm onLogin={handleLogin} />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-blue-600" />
              Account Demo
            </h3>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <strong>Amministratore:</strong><br />
                admin@serramenti.com / admin123
              </div>
              <div className="p-2 bg-green-50 rounded">
                <strong>Dipendente:</strong><br />
                dipendente@serramenti.com / user123
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <EmployeeDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default Index;
