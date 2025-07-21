
import { Button } from "@/components/ui/button";
import { LogOut, Building, User, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { profile, signOut } = useAuth();
  const { settings, loading } = useDashboardSettings();
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-slate-200 animate-pulse rounded-xl"></div>
              <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg"></div>
            </div>
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
      </header>
    );
  }

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
              {settings.logo_url ? (
                <div className="relative">
                  <img
                    src={settings.logo_url}
                    alt="Logo aziendale"
                    className="h-12 w-auto object-contain rounded-xl shadow-sm"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent to-black/5"></div>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
              )}
              
              <div className="flex flex-col">
                <h1 
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: settings.primary_color }}
                >
                  {settings.company_name || "A.L.M Infissi"}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-600">{title}</span>
                  {subtitle && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{subtitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center">
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 px-3 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9 ring-2 ring-slate-200">
                      <AvatarImage src="" alt={`${profile?.first_name} ${profile?.last_name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-slate-900">
                        {profile?.first_name} {profile?.last_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        Amministratore
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
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Impostazioni</span>
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

export default DashboardHeader;
