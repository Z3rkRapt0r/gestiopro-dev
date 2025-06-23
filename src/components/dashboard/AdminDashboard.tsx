
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboardOverview from "./AdminDashboardOverview";
import AdminEmployeesSection from "./AdminEmployeesSection";
import AdminAttendanceSection from "./AdminAttendanceSection";
import AdminDocumentsSection from "./AdminDocumentsSection";
import NotificationsSection from "./NotificationsSection";
import AdminSettingsSection from "../admin/AdminSettingsSection";
import DashboardHeader from "./DashboardHeader";
import EmployeeLeavePage from "../leave/EmployeeLeavePage";
import { EmployeeLeaveBalanceSection } from "../leave/EmployeeLeaveBalanceSection";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Bell, 
  Settings,
  Calendar,
  Wallet
} from "lucide-react";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="container mx-auto py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
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
            <TabsTrigger value="leave-balance" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Saldi</span>
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
            <EmployeeLeavePage />
          </TabsContent>

          <TabsContent value="leave-balance">
            <EmployeeLeaveBalanceSection />
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
