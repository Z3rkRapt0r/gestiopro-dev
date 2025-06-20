
import { Button } from "@/components/ui/button";
import { LogOut, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { profile, signOut } = useAuth();
  const { settings, loading } = useDashboardSettings();

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
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
                style={{ color: settings.primary_color }}
              >
                {settings.company_name || "A.L.M Infissi"} - {title}
              </h1>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {profile?.first_name} {profile?.last_name}
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

export default DashboardHeader;
