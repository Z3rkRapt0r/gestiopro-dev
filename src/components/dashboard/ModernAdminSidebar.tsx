import { useState } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  Briefcase,
  Heart,
  Clock,
  FileText,
  Bell,
  Settings,
  CalendarDays,
  CheckCircle
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'overview', label: 'Panoramica', icon: BarChart3 },
  { id: 'employees', label: 'Dipendenti', icon: Users },
  { id: 'attendance-overview', label: 'Panoramica Presenze', icon: Calendar },
  { id: 'business-trips', label: 'Trasferte', icon: Briefcase },
  { id: 'sick-leaves', label: 'Malattie', icon: Heart },
  { id: 'overtime', label: 'Straordinari', icon: Clock },
  { id: 'company-holidays', label: 'Giorni Festivi', icon: CalendarDays },
  { id: 'leave-approvals', label: 'Approvazioni Ferie', icon: CheckCircle },
  { id: 'documents', label: 'Documenti', icon: FileText },
  { id: 'notifications', label: 'Notifiche', icon: Bell },
  { id: 'settings', label: 'Impostazioni', icon: Settings },
];

export default function ModernAdminSidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut, user, loading } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsSidebarOpen(false); // Close sidebar after navigation
  };

  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <BarChart3 className="h-5 w-5" />
            <span className="sr-only">Apri menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 pt-6 w-72">
          <SheetHeader className="px-6 pb-4">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Naviga tra le sezioni
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "justify-start px-6",
                  activeSection === item.id ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover:bg-secondary/50"
                )}
                onClick={() => handleNavigation(item.id)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
          <SheetHeader className="px-6 pt-8">
            <SheetTitle>Account</SheetTitle>
            <SheetDescription>
              Gestisci il tuo account
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              className="justify-start px-6"
              onClick={() => {
                signOut();
                setIsSidebarOpen(false);
                navigate('/login');
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Esci</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-64 bg-secondary border-r border-secondary-foreground/10">
        <div className="flex items-center justify-center h-16 shrink-0 bg-background border-b border-secondary-foreground/10">
          <span className="font-bold text-lg">Admin Dashboard</span>
        </div>
        <div className="flex-1 flex flex-col gap-0.5 p-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "justify-start",
                activeSection === item.id ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover:bg-secondary/50"
              )}
              onClick={() => handleNavigation(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between h-16 shrink-0 bg-background border-t border-secondary-foreground/10 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 w-full justify-start px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string} />
                  <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.user_metadata?.full_name}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" forceMount>
              <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                signOut();
                navigate('/login');
              }}>
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
