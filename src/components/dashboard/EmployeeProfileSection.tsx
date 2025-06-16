
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const EmployeeProfileSection = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profilo Personale</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-gray-600">{profile?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruolo</label>
              <p className="mt-1 text-sm text-gray-900">Dipendente</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dipartimento</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.department || 'Non specificato'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data Assunzione</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString('it-IT') : 'Non specificata'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice Dipendente</label>
              <p className="mt-1 text-sm text-gray-900">{profile?.employee_code || 'Non assegnato'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfileSection;
