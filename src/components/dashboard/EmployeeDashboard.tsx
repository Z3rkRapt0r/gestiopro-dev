import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Bell, 
  LogOut, 
  Mail,
  User,
  BarChart3,
  Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useNotifications } from "@/hooks/useNotifications";
import DocumentsSection from "./DocumentsSection";
import EmployeeMessagesSection from "./EmployeeMessagesSection";
import NotificationsSection from "./NotificationsSection";
import EmployeeDashboardSection from "./EmployeeDashboardSection";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import EmployeeLeavePage from "@/components/leave/EmployeeLeavePage";
import DashboardHeader from "./DashboardHeader";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

const EmployeeDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { profile, signOut } = useAuth();
  const { documents } = useDocuments();
  const { notifications } = useNotifications();
  const { settings: dashboardSettings } = useDashboardSettings();

  const myDocuments = documents.filter(doc => doc.user_id === profile?.id);
  const unreadNotifications = notifications.filter(n => !n.is_read && n.user_id === profile?.id);

  const renderProfile = () => (
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

  // Skeleton shimmer per loading navigazione interna
  const SectionSkeleton = () => (
    <div className="py-12">
      <Skeleton className="h-6 w-1/3 mb-6" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {dashboardSettings.logo_url ? (
                <img
                  src={dashboardSettings.logo_url}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="bg-blue-600 p-2 rounded">
                  <Users className="h-6 w-6 text-white" />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader 
          title="Dashboard Dipendente"
          subtitle="Visualizza i tuoi documenti, notifiche e statistiche"
        />
        
        {/* Sidebar */}
        <div className="flex space-x-8">
          <div className="w-64 space-y-2">
            <Button
              variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('dashboard')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant={activeSection === 'documents' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('documents')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Documenti
              {myDocuments.length > 0 && (
                <Badge className="ml-auto bg-blue-500 text-white">
                  {myDocuments.length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeSection === 'notifications' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifiche
              {unreadNotifications.length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">
                  {unreadNotifications.length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeSection === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('profile')}
            >
              <User className="mr-2 h-4 w-4" />
              Profilo
            </Button>
            
            <Button
              variant={activeSection === 'messages' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('messages')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Messaggi
            </Button>
            
            <Button
              variant={activeSection === "leave" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("leave")}
            >
              🏖️
              <span className="ml-2">Ferie e Permessi</span>
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Suspense fallback={<SectionSkeleton />}>
              {activeSection === 'dashboard' && <EmployeeDashboardSection />}
              {activeSection === 'documents' && <DocumentsSection />}
              {activeSection === 'notifications' && <NotificationsSection />}
              {activeSection === 'profile' && renderProfile()}
              {activeSection === 'messages' && <EmployeeMessagesSection />}
              {activeSection === "leave" && <EmployeeLeavePage />}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
