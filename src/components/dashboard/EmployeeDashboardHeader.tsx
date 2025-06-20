
import { Button } from "@/components/ui/button";
import { LogOut, Building, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useEmployeeLogoSettings } from "@/hooks/useEmployeeLogoSettings";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EmployeeDashboardHeader = () => {
  const { profile, signOut } = useAuth();
  const { settings: dashboardSettings } = useDashboardSettings();
  const { settings: employeeLogoSettings } = useEmployeeLogoSettings();

  // Determina quale logo mostrare: prima il logo dedicato dipendenti, poi quello dashboard generale
  const logoToShow = employeeLogoSettings.employee_logo_enabled && employeeLogoSettings.employee_default_logo_url
    ? employeeLogoSettings.employee_default_logo_url
    : dashboardSettings.logo_url;

  const userInitials = profile?.first_name && profile?.last_name 
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : 'U';

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo e Title Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {logoToShow ? (
                <div className="relative">
                  <img
                    src={logoToShow}
                    alt="Logo aziendale"
                    className="h-12 w-auto object-contain rounded-xl shadow-sm"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent to-black/5"></div>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
              )}
              
              <div className="flex flex-col">
                <h1 
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: dashboardSettings.primary_color }}
                >
                  {dashboardSettings.company_name || "A.L.M Infissi"}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-600">Dashboard Dipendente</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl">
              <Bell className="h-5 w-5 text-slate-600" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                2
              </Badge>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 px-3 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9 ring-2 ring-slate-200">
                      <AvatarImage src="" alt={`${profile?.first_name} ${profile?.last_name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-slate-900">
                        {profile?.first_name} {profile?.last_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        Dipendente
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profilo</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifiche</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EmployeeDashboardHeader;
