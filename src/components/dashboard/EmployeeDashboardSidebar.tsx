
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Bell, 
  Mail,
  User,
  BarChart3
} from "lucide-react";

interface EmployeeDashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  documentsCount: number;
  unreadNotificationsCount: number;
}

const EmployeeDashboardSidebar = ({ 
  activeSection, 
  onSectionChange, 
  documentsCount, 
  unreadNotificationsCount 
}: EmployeeDashboardSidebarProps) => {
  return (
    <div className="w-64 space-y-2">
      <Button
        variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onSectionChange('dashboard')}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Dashboard
      </Button>
      
      <Button
        variant={activeSection === 'documents' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onSectionChange('documents')}
      >
        <FileText className="mr-2 h-4 w-4" />
        Documenti
        {documentsCount > 0 && (
          <Badge className="ml-auto bg-blue-500 text-white">
            {documentsCount}
          </Badge>
        )}
      </Button>
      
      <Button
        variant={activeSection === 'notifications' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onSectionChange('notifications')}
      >
        <Bell className="mr-2 h-4 w-4" />
        Notifiche
        {unreadNotificationsCount > 0 && (
          <Badge className="ml-auto bg-red-500 text-white">
            {unreadNotificationsCount}
          </Badge>
        )}
      </Button>
      
      <Button
        variant={activeSection === 'profile' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onSectionChange('profile')}
      >
        <User className="mr-2 h-4 w-4" />
        Profilo
      </Button>
      
      <Button
        variant={activeSection === 'messages' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onSectionChange('messages')}
      >
        <Mail className="mr-2 h-4 w-4" />
        Messaggi
      </Button>
      
      <Button
        variant={activeSection === "leave" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("leave")}
      >
        🏖️
        <span className="ml-2">Ferie e Permessi</span>
      </Button>
    </div>
  );
};

export default EmployeeDashboardSidebar;
