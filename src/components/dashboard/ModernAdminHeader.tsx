
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ModernAdminHeaderProps {
  title: string;
}

export default function ModernAdminHeader({ title }: ModernAdminHeaderProps) {
  const { profile, signOut } = useAuth();

  const userInitials = profile?.first_name && profile?.last_name 
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
        {/* Left Section - Title */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{title}</h1>
            <div className="hidden md:flex items-center space-x-2 text-xs sm:text-sm text-slate-500">
              <span>Dashboard</span>
              <span>•</span>
              <span className="capitalize truncate">{title.toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Right Section - User Menu */}
        <div className="flex items-center">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 sm:h-10 px-2 sm:px-3 rounded-xl hover:bg-slate-100/80">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-slate-200">
                    <AvatarImage src="" alt={`${profile?.first_name} ${profile?.last_name}`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs sm:text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                      {profile?.first_name} {profile?.last_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Amministratore
                    </span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 sm:w-64 p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profilo</span>
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
    </header>
  );
}
