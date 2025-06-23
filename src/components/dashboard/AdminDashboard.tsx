
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import AdminDashboardOverview from "./AdminDashboardOverview";
import AdminEmployeesSection from "./AdminEmployeesSection";
import AdminAttendanceSection from "./AdminAttendanceSection";
import AdminDocumentsSection from "./AdminDocumentsSection";
import NotificationsSection from "./NotificationsSection";
import AdminSettingsSection from "../admin/AdminSettingsSection";
import DashboardHeader from "./DashboardHeader";
import AdminLeaveApprovalsSection from "../leave/AdminLeaveApprovalsSection";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Bell, 
  Settings,
  Calendar
} from "lucide-react";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia sezione
  useEffect(() => {
    console.log('Cambio sezione admin, invalidando tutte le query dei bilanci...');
    // Invalida tutte le query principali per aggiornare i dati in tempo reale
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leave_balance_validation'] });
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
  }, [activeTab, queryClient]);

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Dashboard Amministratore" />
      <div className="container mx-auto py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Dipendenti</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Presenze</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Permessi</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documenti</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Impostazioni</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboardOverview />
          </TabsContent>

          <TabsContent value="employees">
            <AdminEmployeesSection />
          </TabsContent>

          <TabsContent value="attendance">
            <AdminAttendanceSection />
          </TabsContent>

          <TabsContent value="leaves">
            <AdminLeaveApprovalsSection />
          </TabsContent>

          <TabsContent value="documents">
            <AdminDocumentsSection />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSection />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettingsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
