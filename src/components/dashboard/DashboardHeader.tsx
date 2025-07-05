
import { Button } from "@/components/ui/button";
import { LogOut, Building, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useNotifications } from "@/hooks/useNotifications";
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
import { useState } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { profile, signOut } = useAuth();
  const { settings, loading } = useDashboardSettings();
  const { notifications, markAsRead } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Calcola le notifiche non lette
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 p-0" align="end" forceMount>
                <DropdownMenuLabel className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Notifiche</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary">{unreadCount} nuove</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nessuna notifica
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex flex-col space-y-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{notification.title}</span>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-400">
                            {new Date(notification.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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

export default DashboardHeader;
