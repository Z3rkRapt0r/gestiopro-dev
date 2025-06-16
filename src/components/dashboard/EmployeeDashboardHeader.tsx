
import { Button } from "@/components/ui/button";
import { LogOut, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useEmployeeLogoSettings } from "@/hooks/useEmployeeLogoSettings";

const EmployeeDashboardHeader = () => {
  const { profile, signOut } = useAuth();
  const { settings: dashboardSettings } = useDashboardSettings();
  const { settings: employeeLogoSettings } = useEmployeeLogoSettings();

  // Determina quale logo mostrare: prima il logo dedicato dipendenti, poi quello dashboard generale
  const logoToShow = employeeLogoSettings.employee_logo_enabled && employeeLogoSettings.employee_default_logo_url
    ? employeeLogoSettings.employee_default_logo_url
    : dashboardSettings.logo_url;

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {logoToShow ? (
              <img
                src={logoToShow}
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="bg-blue-600 p-2 rounded">
                <Building className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="ml-4">
              <h1 
                className="text-xl font-semibold"
                style={{ color: dashboardSettings.primary_color }}
              >
                {dashboardSettings.company_name || "A.L.M Infissi"} - Gestionale
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Benvenuto {profile?.first_name} {profile?.last_name}
            </span>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EmployeeDashboardHeader;
